import { headers } from "next/headers";
import * as fs from "fs";
import * as path from "path";
import { DATA_ROOT, getOutputByFile, getSiteManifest } from "@/lib/get-output";
import { logRoutingEvent } from "@/lib/log-event";
import { PreviewClient } from "@/components/preview/PreviewClient";
import type { VariantOverrideMap } from "@/lib/types";

export const dynamic = "force-dynamic";

function getRoutingConfig(): { ts: string } | null {
  try {
    const dataRoot = process.env.VERCEL
      ? path.join(process.cwd(), "mode-data")
      : path.resolve(process.cwd(), "..");
    const configPath = path.join(dataRoot, "config/routing.json");
    if (!fs.existsSync(configPath)) return null;
    const data = JSON.parse(fs.readFileSync(configPath, "utf8")) as { ts?: string };
    if (!data.ts) return null;
    return { ts: data.ts };
  } catch {
    return null;
  }
}

function NoActiveBuild() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 text-center px-6">
      <p className="text-sm font-medium text-zinc-500">No active build</p>
      <p className="text-xs text-zinc-400 mt-1">
        Generate a build in the dashboard, then click Activate.
      </p>
      <a
        href="/admin/build"
        className="mt-4 text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
      >
        Go to Build →
      </a>
    </div>
  );
}

export default async function Home() {
  const routing = getRoutingConfig();
  if (!routing) return <NoActiveBuild />;

  const manifest = getSiteManifest(routing.ts);
  if (!manifest) return <NoActiveBuild />;

  const h = await headers();
  const funnelStage     = h.get("x-mode-funnel-stage")     ?? "awareness";
  const funnelSignal    = h.get("x-mode-funnel-signal")    ?? "default";
  const archetype       = h.get("x-mode-archetype")        ?? "Validator";
  const archetypeSignal = h.get("x-mode-archetype-signal") ?? "default";

  // The homepage never serves the conversion register — that belongs to /pricing.
  // If routing signals have advanced a visitor to conversion, fall back to decision
  // so the homepage stays in the exploration register and /pricing stays distinct.
  const effectiveFunnelStage = funnelStage === "conversion" ? "decision" : funnelStage;

  // Pick the routing dimension based on what drove this build's palette
  const variantLabel = manifest.palette_driver === "archetype" ? archetype : effectiveFunnelStage;
  const page =
    manifest.pages.find((p) => p.label.toLowerCase() === variantLabel.toLowerCase()) ?? manifest.pages[0];
  if (!page) return <NoActiveBuild />;

  const output = getOutputByFile(page.filename);
  if (!output) return <NoActiveBuild />;

  let variantOverrides: VariantOverrideMap = {};
  try {
    const overridesPath = path.join(DATA_ROOT, "tokens", "variant-overrides.json");
    if (fs.existsSync(overridesPath)) {
      variantOverrides = JSON.parse(fs.readFileSync(overridesPath, "utf8")) as VariantOverrideMap;
    }
  } catch {
    variantOverrides = {};
  }

  logRoutingEvent({
    ts:               new Date().toISOString(),
    funnel_stage:     effectiveFunnelStage,
    funnel_signal:    funnelSignal,
    archetype,
    archetype_signal: archetypeSignal,
    variant_label:    variantLabel,
    palette_driver:   manifest.palette_driver ?? "funnel_stage",
    build_ts:         routing.ts,
  });

  return <PreviewClient output={output} variantOverrides={variantOverrides} />;
}
