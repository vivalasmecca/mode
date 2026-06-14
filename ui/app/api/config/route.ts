import * as fs from "fs";
import * as path from "path";

export const dynamic = "force-dynamic";

// Which brief field is iterated to produce variants, per palette_key.
const VARIANT_VALUES: Record<string, string[]> = {
  funnel_stage: ["awareness", "consideration", "decision", "conversion"],
  archetype: ["Mover", "Validator", "Explorer"],
};

// The other dimension — fixed by the user for this build.
const FIXED_DIMENSION: Record<string, string> = {
  funnel_stage: "archetype",
  archetype: "funnel_stage",
};

export async function GET() {
  try {
    const tokensPath = path.resolve(process.cwd(), "../tokens/mode-tokens.json");
    const tokens = JSON.parse(fs.readFileSync(tokensPath, "utf8"));

    const activePreset = tokens.active_preset as string;

    // Build a list of all available presets so the UI can render the selector.
    const presets = Object.entries(tokens.presets as Record<string, {
      description: string;
      palette_driver: string;
      palette_key?: string;
    }>).map(([key, preset]) => {
      const paletteKey = preset.palette_key ?? "funnel_stage";
      return {
        key,
        description: preset.description,
        paletteDriver: preset.palette_driver,
        variantDimension: paletteKey,
        variantValues: VARIANT_VALUES[paletteKey] ?? VARIANT_VALUES.funnel_stage,
        fixedDimension: FIXED_DIMENSION[paletteKey] ?? "archetype",
      };
    });

    const activeConfig = presets.find((p) => p.key === activePreset) ?? presets[0];

    if (!activeConfig) {
      return Response.json(
        { error: `Unknown preset "${activePreset}" in mode-tokens.json` },
        { status: 500 }
      );
    }

    return Response.json({
      activePreset,
      presets,
      // Convenience fields matching the active preset — kept for any consumers
      // that haven't yet switched to the presets array.
      presetDescription: activeConfig.description,
      paletteDriver: activeConfig.paletteDriver,
      variantDimension: activeConfig.variantDimension,
      variantValues: activeConfig.variantValues,
      fixedDimension: activeConfig.fixedDimension,
    });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
