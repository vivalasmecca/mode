/**
 * palette-vars — reads tokens/color-scale.json and tokens/theme.json at
 * request time and returns a CSS custom properties object to be set on
 * <html style={}>.
 *
 * color-scale.json  — the color vocabulary (brand's color scale)
 * theme.json        — semantic assignment (which scale entry serves which token)
 *
 * theme.json values use dot notation to reference the scale: "gray.900",
 * "indigo.600". Top-level entries ("white", "black") are referenced by name.
 * A value with no matching scale entry passes through as a literal CSS string.
 *
 * Because both files are read at request time, changes take effect on the
 * next request — no rebuild required.
 */

import * as fs from "fs";
import * as path from "path";
import { DATA_ROOT } from "./get-output";

type ColorScale = Record<string, string | Record<string, string>>;

interface PaletteMode {
  bg: string;
  text: string;
  subtext: string;
  muted: string;
  border: string;
  iconBg: string;
}

interface ThemeJson {
  palette_modes: { light: PaletteMode; neutral: PaletteMode; dark: PaletteMode };
  accent: {
    on_light: { bg: string; text: string };
    on_dark: { bg: string; text: string };
  };
}

/**
 * Resolves a theme.json reference to a CSS color string.
 * "gray.900"   → scale.gray["900"]
 * "white"      → scale.white
 * "#4f46e5"    → "#4f46e5" (literal passthrough — no scale entry)
 */
function resolve(ref: string, scale: ColorScale): string {
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

function modeVars(
  prefix: string,
  m: PaletteMode,
  scale: ColorScale,
): Record<string, string> {
  return {
    [`--mode-${prefix}-bg`]:      resolve(m.bg,      scale),
    [`--mode-${prefix}-text`]:    resolve(m.text,    scale),
    [`--mode-${prefix}-subtext`]: resolve(m.subtext, scale),
    [`--mode-${prefix}-muted`]:   resolve(m.muted,   scale),
    [`--mode-${prefix}-border`]:  resolve(m.border,  scale),
    [`--mode-${prefix}-icon-bg`]: resolve(m.iconBg,  scale),
  };
}

export function getPaletteVars(): Record<string, string> {
  try {
    const scalePath = path.join(DATA_ROOT, "tokens", "color-scale.json");
    const themePath = path.join(DATA_ROOT, "tokens", "theme.json");
    const scale = JSON.parse(fs.readFileSync(scalePath, "utf8")) as ColorScale;
    const theme = JSON.parse(fs.readFileSync(themePath, "utf8")) as ThemeJson;
    const { palette_modes: p, accent: a } = theme;

    return {
      ...modeVars("light",   p.light,   scale),
      ...modeVars("neutral", p.neutral, scale),
      ...modeVars("dark",    p.dark,    scale),
      "--mode-accent-light-bg":   resolve(a.on_light.bg,   scale),
      "--mode-accent-light-text": resolve(a.on_light.text, scale),
      "--mode-accent-dark-bg":    resolve(a.on_dark.bg,    scale),
      "--mode-accent-dark-text":  resolve(a.on_dark.text,  scale),
    };
  } catch {
    // Fail silently — CSS variable references resolve to empty, which is
    // visible in dev but won't crash the app.
    return {};
  }
}
