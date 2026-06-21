import * as fs from "fs";
import * as path from "path";
import { DATA_ROOT, getOutputByFile, getSiteManifest, getPageRegistry, findVariantFile } from "@/lib/get-output";
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

  // Build a map from variant label → route path (e.g. "conversion" → "/pricing")
  const pageRegistry = getPageRegistry();
  const variantLabelToRoute: Record<string, string> = {};
  for (const entry of pageRegistry) {
    if (entry.variant_label) variantLabelToRoute[entry.variant_label] = entry.route;
  }

  const variants: Array<{ label: string; filename: string; output: PageOutput; route?: string | null }> = [];
  if (manifest) {
    for (const page of manifest.pages) {
      const output = getOutputByFile(page.filename);
      if (output) {
        // Use the human page label ("Pricing") only when label is the page slug, not a variant
        // discriminator. "pricing" → "Pricing" ✓; "mover" (vs "Homepage") → keep "mover" ✓
        const pageSlugMatch =
          page.page &&
          page.page.toLowerCase().replace(/\s+/g, "-") === page.label;
        variants.push({
          label: pageSlugMatch ? page.page! : page.label,
          filename: page.filename,
          output,
          // Prefer the route stored in the manifest; fall back to registry lookup by variant label
          route: page.route ?? variantLabelToRoute[page.label] ?? null,
        });
      }
    }
  }

  // Add supplemental page cards for registry entries whose variant_label is not
  // already in the active build. This keeps the pricing page visible in Studio
  // even when an archetype-driven build (no conversion variant) is active.
  //
  // Dedup by both label AND filename — the archetype build labels the pricing
  // manifest entry "pricing" (page slug) while the registry stores variant_label
  // "conversion"; without filename dedup, the same file shows twice.
  const loadedLabels = new Set(variants.map((v) => v.label));
  const loadedFilenames = new Set(variants.map((v) => v.filename));
  for (const entry of pageRegistry) {
    if (!entry.variant_label) continue;
    if (loadedLabels.has(entry.variant_label)) continue;
    if (entry.filename && loadedFilenames.has(entry.filename)) continue;
    const found = findVariantFile(entry.variant_label, buildTs);
    if (found) {
      if (loadedFilenames.has(found.filename)) continue; // resolved to same file already loaded
      variants.push({
        label: entry.label,
        filename: found.filename,
        output: found.output,
        route: entry.route,
      });
      loadedFilenames.add(found.filename);
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
