import { NextResponse, type NextRequest } from "next/server";

const FUNNEL_STAGES = ["awareness", "consideration", "decision", "conversion"];
const ARCHETYPES = ["Mover", "Validator", "Explorer"];

function detectFunnelStage(
  url: URL,
  cookieFunnel: string | undefined,
): { stage: string; signal: string } {
  // 1. Direct override params (testing)
  const pageParam = url.searchParams.get("page");
  if (pageParam && FUNNEL_STAGES.includes(pageParam))
    return { stage: pageParam, signal: "param" };

  const funnelParam = url.searchParams.get("funnel_stage");
  if (funnelParam && FUNNEL_STAGES.includes(funnelParam))
    return { stage: funnelParam, signal: "param" };

  // 2. UTM medium signals
  const utmMedium = url.searchParams.get("utm_medium")?.toLowerCase() ?? "";
  if (utmMedium === "email" || utmMedium === "newsletter")
    return { stage: "consideration", signal: "utm_medium" };
  if (utmMedium === "retargeting" || utmMedium === "cpc" || utmMedium === "paid")
    return { stage: "decision", signal: "utm_medium" };

  // 3. UTM campaign signals
  const utmCampaign = url.searchParams.get("utm_campaign")?.toLowerCase() ?? "";
  if (/checkout|purchase|buy|cart/.test(utmCampaign))
    return { stage: "conversion", signal: "utm_campaign" };

  // 4. Cookie — stored as the next stage from the previous visit
  if (cookieFunnel && FUNNEL_STAGES.includes(cookieFunnel))
    return { stage: cookieFunnel, signal: "cookie" };

  // 5. Default
  return { stage: "awareness", signal: "default" };
}

function detectArchetype(
  url: URL,
  userAgent: string,
  cookieArchetype: string | undefined,
): { archetype: string; signal: string } {
  // 1. Direct override
  const archetypeParam = url.searchParams.get("archetype");
  if (archetypeParam && ARCHETYPES.includes(archetypeParam))
    return { archetype: archetypeParam, signal: "param" };

  // 2. UTM-declared archetype
  const utmContent = url.searchParams.get("utm_content");
  if (utmContent && ARCHETYPES.includes(utmContent))
    return { archetype: utmContent, signal: "utm_content" };

  // 3. Sticky cookie
  if (cookieArchetype && ARCHETYPES.includes(cookieArchetype))
    return { archetype: cookieArchetype, signal: "cookie" };

  // 4. Mobile UA → Mover
  if (/Mobile|Android|iPhone|iPad/i.test(userAgent))
    return { archetype: "Mover", signal: "ua" };

  // 5. Default
  return { archetype: "Validator", signal: "default" };
}

function advanceStage(stage: string): string {
  const idx = FUNNEL_STAGES.indexOf(stage);
  // Unknown or already at conversion — stay put
  if (idx === -1 || idx === FUNNEL_STAGES.length - 1) return stage;
  return FUNNEL_STAGES[idx + 1];
}

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/admin")) {
    if (process.env.VERCEL && !process.env.ADMIN_KEY) {
      return new Response("Admin routes are only available in local development.", { status: 403 });
    }
    return NextResponse.next();
  }

  const url = new URL(request.url);
  const cookieFunnel = request.cookies.get("mode_funnel_stage")?.value;
  const cookieArchetype = request.cookies.get("mode_archetype")?.value;

  const { stage: funnelStage, signal: funnelSignal } = detectFunnelStage(url, cookieFunnel);
  const { archetype, signal: archetypeSignal } = detectArchetype(
    url,
    request.headers.get("user-agent") ?? "",
    cookieArchetype,
  );

  const response = NextResponse.next({
    request: {
      headers: new Headers({
        ...Object.fromEntries(request.headers),
        "x-mode-funnel-stage":    funnelStage,
        "x-mode-funnel-signal":   funnelSignal,
        "x-mode-archetype":       archetype,
        "x-mode-archetype-signal": archetypeSignal,
      }),
    },
  });

  // Store the next stage so the following visit gets the advanced stage
  const nextStage = advanceStage(funnelStage);
  response.cookies.set("mode_funnel_stage", nextStage, {
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  // Archetype is sticky — set on first detection, preserved thereafter
  response.cookies.set("mode_archetype", archetype, {
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  return response;
}

export const config = { matcher: ["/", "/admin/:path*"] };
