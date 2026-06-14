/**
 * SocialProofBar — credibility through logos or a featured quote.
 * Variants: logos-only | single-quote | quote-with-logos
 */

import type { ComponentSlots, PaletteMode } from "@/lib/types";
import { getPalette } from "@/lib/palette";
import { PlaceholderSlot } from "@/components/blocks/PlaceholderSlot";
import { LogoStrip } from "@/components/blocks/LogoStrip";

interface SocialProofBarProps {
  slots: ComponentSlots;
  variant: string | null;
  palette?: PaletteMode;
}

export function SocialProofBar({ slots, variant, palette }: SocialProofBarProps) {
  const p = getPalette(palette);
  const logos = Array.isArray(slots.logos) ? slots.logos : [];
  const showQuote = variant === "single-quote" || variant === "quote-with-logos";
  const showLogos = variant !== "single-quote";

  return (
    <section className={`border-y ${p.border} ${p.bg} py-10`}>
      <div className="mx-auto max-w-6xl px-6">
        {!!(slots.headline) && (
          <PlaceholderSlot name="headline" value={slots.headline}>
            <p className={`mb-6 text-center text-xs font-semibold uppercase tracking-widest ${p.muted}`}>
              {slots.headline as string}
            </p>
          </PlaceholderSlot>
        )}

        {showQuote && (
          <div className="mb-8 text-center">
            <PlaceholderSlot name="quote" value={slots.quote}>
              <blockquote className={`text-lg font-medium italic ${p.text}`}>
                &ldquo;{slots.quote as string}&rdquo;
              </blockquote>
            </PlaceholderSlot>
            {!!(slots.attribution) && (
              <PlaceholderSlot name="attribution" value={slots.attribution}>
                <cite className={`mt-2 block text-sm not-italic ${p.subtext}`}>
                  — {slots.attribution as string}
                </cite>
              </PlaceholderSlot>
            )}
          </div>
        )}

        {showLogos && (
          <div className="flex justify-center">
            <LogoStrip logos={logos as []} />
          </div>
        )}
      </div>
    </section>
  );
}
