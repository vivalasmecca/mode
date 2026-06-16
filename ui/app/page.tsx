import { headers } from "next/headers";
import * as fs from "fs";
import * as path from "path";
import { getOutputByFile, getSiteManifest } from "@/lib/get-output";
import { PreviewClient } from "@/components/preview/PreviewClient";

export const dynamic = "force-dynamic";

function getRoutingConfig(): { ts: string } | null {
  try {
    const configPath = path.resolve(process.cwd(), "../config/routing.json");
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
        href="/dashboard/build"
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
  const funnelStage = h.get("x-mode-funnel-stage") ?? "awareness";
  const archetype = h.get("x-mode-archetype") ?? "Validator";

  // Pick the routing dimension based on what drove this build's palette
  const variantLabel = manifest.palette_driver === "archetype" ? archetype : funnelStage;
  const page =
    manifest.pages.find((p) => p.label === variantLabel) ?? manifest.pages[0];
  if (!page) return <NoActiveBuild />;

  const output = getOutputByFile(page.filename);
  if (!output) return <NoActiveBuild />;

  return <PreviewClient output={output} />;
}
