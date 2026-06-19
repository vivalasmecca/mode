import * as fs from "fs";
import * as path from "path";
import { DATA_ROOT, getOutputByFile, getSiteManifest } from "@/lib/get-output";
import type { PageOutput } from "@/lib/types";
import { StudioClient } from "./StudioClient";

export const dynamic = "force-dynamic";

function getActiveBuildTs(): string | null {
  try {
    const filepath = path.join(DATA_ROOT, "config", "routing.json");
    if (!fs.existsSync(filepath)) return null;
    const data = JSON.parse(fs.readFileSync(filepath, "utf8")) as { ts?: string };
    return typeof data.ts === "string" && data.ts ? data.ts : null;
  } catch {
    return null;
  }
}

function readJson(filepath: string): unknown {
  try {
    if (!fs.existsSync(filepath)) return null;
    return JSON.parse(fs.readFileSync(filepath, "utf8"));
  } catch {
    return null;
  }
}

export default function StudioPage() {
  const buildTs = getActiveBuildTs();
  const manifest = buildTs ? getSiteManifest(buildTs) : null;

  const variants: Array<{ label: string; filename: string; output: PageOutput }> = [];
  if (manifest) {
    for (const page of manifest.pages) {
      const output = getOutputByFile(page.filename);
      if (output) variants.push({ label: page.label, filename: page.filename, output });
    }
  }

  const colorScale =
    (readJson(path.join(DATA_ROOT, "tokens", "color-scale.json")) as Record<string, unknown>) ?? {};

  const themeRaw = readJson(path.join(DATA_ROOT, "tokens", "theme.json")) as {
    palette_modes?: Record<string, Record<string, string>>;
    accent?: Record<string, Record<string, string>>;
  } | null;

  const initialPaletteModes = themeRaw?.palette_modes ?? {};
  const initialAccent = themeRaw?.accent ?? {};

  return (
    <StudioClient
      variants={variants}
      initialColorScale={colorScale}
      initialPaletteModes={initialPaletteModes}
      initialAccent={initialAccent}
      buildTs={buildTs}
    />
  );
}
