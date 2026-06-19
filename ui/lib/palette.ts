/**
 * Palette utility — returns Tailwind class sets for each palette mode.
 *
 * These values MIRROR tokens/theme.json (the expression layer).
 * When you change theme.json, update this file to match.
 *
 * Why two files? palette.ts is bundled into the browser (client components
 * can't read the filesystem). theme.json is the canonical source the agent
 * and token resolver read at server/build time. They must stay in sync.
 *
 * Long-term: replace static classes with CSS custom properties so theme.json
 * becomes the single source of truth and browser components read variables
 * instead of hardcoded Tailwind classes.
 *
 * Usage:
 *   const p = getPalette(palette);
 *   <section className={p.bg}>
 *     <h2 className={p.text}>...</h2>
 *     <p className={p.subtext}>...</p>
 *   </section>
 */

import type { PaletteMode } from "./types";

export interface PaletteClasses {
  bg: string;       // section background
  text: string;     // primary text (headlines)
  subtext: string;  // body / supporting text
  muted: string;    // metadata, captions, source attribution
  border: string;   // dividers and rule borders
  iconBg: string;   // icon container backgrounds
}

// Mirror of tokens/theme.json → palette_modes
const PALETTE: Record<PaletteMode, PaletteClasses> = {
  light: {
    bg:      "bg-white",
    text:    "text-gray-900",
    subtext: "text-gray-600",
    muted:   "text-gray-400",
    border:  "border-gray-100",
    iconBg:  "bg-gray-100",
  },
  neutral: {
    bg:      "bg-gray-50",
    text:    "text-gray-900",
    subtext: "text-gray-600",
    muted:   "text-gray-500",
    border:  "border-gray-200",
    iconBg:  "bg-gray-100",
  },
  dark: {
    bg:      "bg-gray-900",
    text:    "text-white",
    subtext: "text-gray-300",
    muted:   "text-gray-500",
    border:  "border-gray-700",
    iconBg:  "bg-gray-800",
  },
};

export function getPalette(mode?: PaletteMode): PaletteClasses {
  return PALETTE[mode ?? "light"];
}
