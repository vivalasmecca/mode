import * as fs from "fs";
import * as path from "path";
import { DATA_ROOT, findVariantFile } from "@/lib/get-output";
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

export default async function Pricing() {
  const routing = getRoutingConfig();

  // Always serve the conversion variant, searching across all builds if needed.
  // When an archetype-driven build is active, the conversion file lives in an
  // earlier funnel build — findVariantFile searches all manifests newest-first.
  const found = findVariantFile("conversion", routing?.ts ?? null);
  if (!found) return <NoActiveBuild />;

  const { output } = found;

  let variantOverrides: VariantOverrideMap = {};
  try {
    const overridesPath = path.join(DATA_ROOT, "tokens", "variant-overrides.json");
    if (fs.existsSync(overridesPath)) {
      variantOverrides = JSON.parse(fs.readFileSync(overridesPath, "utf8")) as VariantOverrideMap;
    }
  } catch {
    variantOverrides = {};
  }

  return <PreviewClient output={output} variantOverrides={variantOverrides} />;
}
