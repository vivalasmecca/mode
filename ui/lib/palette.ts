/**
 * Palette utility — returns Tailwind class sets for each palette mode.
 *
 * Three modes: light | neutral | dark
 *
 *   light   — white bg, default text. Neutral canvas, chrome, top-of-funnel.
 *   neutral — gray-50 bg, default text. Mild separation for informational sections.
 *   dark    — gray-900 bg, inverted text. High emphasis: trust anchors, conversion gates.
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
