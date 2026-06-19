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

/** Resolved hex values for display — parallel to AccentData but always hex. */
export interface ResolvedColors {
  accent: AccentData;
  modeBgs: { light: string; neutral: string; dark: string };
}

type ColorScale = Record<string, string | Record<string, string>>;

function resolveColor(ref: string, scale: ColorScale): string {
  const dot = ref.indexOf(".");
  if (dot === -1) {
    const entry = scale[ref];
    return typeof entry === "string" ? entry : ref;
  }
  const hue = ref.slice(0, dot);
  const step = ref.slice(dot + 1);
  const hueScale = scale[hue];
  if (hueScale && typeof hueScale === "object") {
    return (hueScale as Record<string, string>)[step] ?? ref;
  }
  return ref;
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

  const scalePath = path.resolve(process.cwd(), "../tokens/color-scale.json");
  const colorScale = JSON.parse(fs.readFileSync(scalePath, "utf8")) as ColorScale;

  const themePath = path.resolve(process.cwd(), "../tokens/theme.json");
  const theme = JSON.parse(fs.readFileSync(themePath, "utf8"));

  const accent: AccentData = theme.accent ?? {
    on_light: { bg: "indigo.600", text: "white" },
    on_dark:  { bg: "white",      text: "gray.900" },
  };

  const pm = theme.palette_modes ?? {};
  const resolved: ResolvedColors = {
    accent: {
      on_light: {
        bg:   resolveColor(accent.on_light.bg,   colorScale),
        text: resolveColor(accent.on_light.text, colorScale),
      },
      on_dark: {
        bg:   resolveColor(accent.on_dark.bg,   colorScale),
        text: resolveColor(accent.on_dark.text, colorScale),
      },
    },
    modeBgs: {
      light:   resolveColor(pm.light?.bg   ?? "white",    colorScale),
      neutral: resolveColor(pm.neutral?.bg ?? "gray.50",  colorScale),
      dark:    resolveColor(pm.dark?.bg    ?? "gray.900", colorScale),
    },
  };

  return (
    <PaletteClient
      presets={presets}
      activePreset={activePreset}
      accent={accent}
      resolved={resolved}
    />
  );
}
