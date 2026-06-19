/**
 * palette-vars — reads tokens/theme.json at request time and returns
 * a CSS custom properties object to be set on <html style={}>.
 *
 * This is the server-side half of the CSS variables layer.
 * The client-side half is palette.ts, which maps modes to Tailwind
 * arbitrary-value classes that reference these variables.
 *
 * Because values come from the filesystem at request time, changing
 * theme.json takes effect on the next request — no rebuild required.
 */

import * as fs from "fs";
import * as path from "path";
import { DATA_ROOT } from "./get-output";

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

function modeVars(prefix: string, m: PaletteMode): Record<string, string> {
  return {
    [`--mode-${prefix}-bg`]:      m.bg,
    [`--mode-${prefix}-text`]:    m.text,
    [`--mode-${prefix}-subtext`]: m.subtext,
    [`--mode-${prefix}-muted`]:   m.muted,
    [`--mode-${prefix}-border`]:  m.border,
    [`--mode-${prefix}-icon-bg`]: m.iconBg,
  };
}

export function getPaletteVars(): Record<string, string> {
  try {
    const filepath = path.join(DATA_ROOT, "tokens", "theme.json");
    const theme = JSON.parse(fs.readFileSync(filepath, "utf8")) as ThemeJson;
    const { palette_modes: p, accent: a } = theme;

    return {
      ...modeVars("light",   p.light),
      ...modeVars("neutral", p.neutral),
      ...modeVars("dark",    p.dark),
      "--mode-accent-light-bg":   a.on_light.bg,
      "--mode-accent-light-text": a.on_light.text,
      "--mode-accent-dark-bg":    a.on_dark.bg,
      "--mode-accent-dark-text":  a.on_dark.text,
    };
  } catch {
    // Fail silently — CSS variable references resolve to empty, which is
    // visible in dev but won't crash the app.
    return {};
  }
}
