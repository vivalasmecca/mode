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

export interface AccentData {
  on_light: { bg: string; text: string };
  on_dark: { bg: string; text: string };
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

  const accent: AccentData = tokens.accent ?? {
    on_light: { bg: "bg-indigo-600", text: "text-white" },
    on_dark: { bg: "bg-white", text: "text-gray-900" },
  };

  return <PaletteClient presets={presets} activePreset={activePreset} accent={accent} />;
}
