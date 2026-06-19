/**
 * Palette utility — returns Tailwind arbitrary-value classes that reference
 * CSS custom properties set on <html> by the root layout (palette-vars.ts).
 *
 * This file is now STATIC — it never needs to be updated when theme.json
 * changes. Edit tokens/theme.json to change the visual expression of each
 * palette mode. Changes take effect on the next request with no rebuild.
 *
 * Variable names follow the pattern: --mode-{light|neutral|dark}-{property}
 * Accent variables: --mode-accent-{light|dark}-{bg|text}
 *
 * Usage (unchanged from before):
 *   const p = getPalette(palette);
 *   <section className={p.bg}>
 *     <h2 className={p.text}>...</h2>
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

// CSS variable references — values come from tokens/theme.json at request time
const PALETTE: Record<PaletteMode, PaletteClasses> = {
  light: {
    bg:      "bg-[var(--mode-light-bg)]",
    text:    "text-[var(--mode-light-text)]",
    subtext: "text-[var(--mode-light-subtext)]",
    muted:   "text-[var(--mode-light-muted)]",
    border:  "border-[var(--mode-light-border)]",
    iconBg:  "bg-[var(--mode-light-icon-bg)]",
  },
  neutral: {
    bg:      "bg-[var(--mode-neutral-bg)]",
    text:    "text-[var(--mode-neutral-text)]",
    subtext: "text-[var(--mode-neutral-subtext)]",
    muted:   "text-[var(--mode-neutral-muted)]",
    border:  "border-[var(--mode-neutral-border)]",
    iconBg:  "bg-[var(--mode-neutral-icon-bg)]",
  },
  dark: {
    bg:      "bg-[var(--mode-dark-bg)]",
    text:    "text-[var(--mode-dark-text)]",
    subtext: "text-[var(--mode-dark-subtext)]",
    muted:   "text-[var(--mode-dark-muted)]",
    border:  "border-[var(--mode-dark-border)]",
    iconBg:  "bg-[var(--mode-dark-icon-bg)]",
  },
};

export function getPalette(mode?: PaletteMode): PaletteClasses {
  return PALETTE[mode ?? "light"];
}
