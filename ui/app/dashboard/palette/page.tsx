import * as fs from "fs";
import * as path from "path";
import PaletteClient from "./PaletteClient";

export const dynamic = "force-dynamic";

export interface PresetData {
  key: string;
  description: string;
  paletteDriver: string;
  paletteKey: string;
  paletteMap: Record<string, Record<string, string>>;
}

export default function PalettePage() {
  const tokensPath = path.resolve(process.cwd(), "../tokens/mode-tokens.json");
  const tokens = JSON.parse(fs.readFileSync(tokensPath, "utf8"));

  const activePreset = tokens.active_preset as string;

  const presets: PresetData[] = Object.entries(
    tokens.presets as Record<
      string,
      {
        description: string;
        palette_driver: string;
        palette_key?: string;
        palette_map: Record<string, Record<string, string>>;
      }
    >
  ).map(([key, preset]) => ({
    key,
    description: preset.description,
    paletteDriver: preset.palette_driver,
    paletteKey: preset.palette_key ?? "funnel_stage",
    paletteMap: preset.palette_map,
  }));

  return <PaletteClient presets={presets} activePreset={activePreset} />;
}
