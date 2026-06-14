/**
 * TrustSignal — optional friction-reducing string near a CTA.
 * Returns null when value is null — no placeholder needed (it's an optional slot).
 * Accepts palette to invert colors on dark sections.
 */

import type { PaletteMode } from "@/lib/types";

interface TrustSignalProps {
  value: string | null | undefined;
  palette?: PaletteMode;
}

export function TrustSignal({ value, palette }: TrustSignalProps) {
  if (!value) return null;
  const isDark = palette === "dark";
  return (
    <p className={`text-sm flex items-center gap-1.5 ${isDark ? "text-gray-300" : "text-gray-500"}`}>
      <svg
        className={`w-3.5 h-3.5 ${isDark ? "text-gray-500" : "text-gray-400"}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      {value}
    </p>
  );
}
