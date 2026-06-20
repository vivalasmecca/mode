import * as fs from "fs";
import * as path from "path";
import { DATA_ROOT, getOutputByFile, getSiteManifest } from "@/lib/get-output";
import type { PageOutput, VariantOverrideMap } from "@/lib/types";
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

  // Build componentSlots map from manifest
  const componentManifestRaw = readJson(path.join(DATA_ROOT, "manifest", "components.json")) as {
    components?: Array<{
      name: string;
      slots: Record<string, string>;
      variants?: string[];
      variant_slots?: Record<string, string[]>;
      properties?: Record<string, string[]>;
    }>;
  } | null;
  const componentSlots: Record<string, Record<string, string>> = {};
  const componentVariants: Record<string, string[]> = {};
  const componentVariantSlots: Record<string, Record<string, string[]>> = {};
  const componentProperties: Record<string, Record<string, string[]>> = {};
  if (componentManifestRaw?.components) {
    for (const c of componentManifestRaw.components) {
      componentSlots[c.name] = c.slots ?? {};
      componentVariants[c.name] = c.variants ?? [];
      if (c.variant_slots) componentVariantSlots[c.name] = c.variant_slots;
      if (c.properties) componentProperties[c.name] = c.properties;
    }
  }

  const variantOverrides = (readJson(
    path.join(DATA_ROOT, "tokens", "variant-overrides.json")
  ) ?? {}) as VariantOverrideMap;

  return (
    <StudioClient
      variants={variants}
      initialColorScale={colorScale}
      initialPaletteModes={initialPaletteModes}
      initialAccent={initialAccent}
      buildTs={buildTs}
      componentSlots={componentSlots}
      componentVariants={componentVariants}
      componentVariantSlots={componentVariantSlots}
      componentProperties={componentProperties}
      initialVariantOverrides={variantOverrides}
    />
  );
}
