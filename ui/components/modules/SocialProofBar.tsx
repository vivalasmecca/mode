/**
 * SocialProofBar — credibility through logos or a featured quote.
 * Variants: logos-only | single-quote | quote-with-logos
 */

import type { ComponentSlots } from "@/lib/types";
import { PlaceholderSlot } from "@/components/blocks/PlaceholderSlot";
import { LogoStrip } from "@/components/blocks/LogoStrip";

interface SocialProofBarProps {
  slots: ComponentSlots;
  variant: string | null;
}

export function SocialProofBar({ slots, variant }: SocialProofBarProps) {
  const logos = Array.isArray(slots.logos) ? slots.logos : [];
  const showQuote = variant === "single-quote" || variant === "quote-with-logos";
  const showLogos = variant !== "single-quote";

  return (
    <section className="border-y border-gray-100 bg-gray-50 py-10">
      <div className="mx-auto max-w-6xl px-6">
        {!!(slots.headline) && (
          <PlaceholderSlot name="headline" value={slots.headline}>
            <p className="mb-6 text-center text-xs font-semibold uppercase tracking-widest text-gray-400">
              {slots.headline as string}
            </p>
          </PlaceholderSlot>
        )}

        {showQuote && (
          <div className="mb-8 text-center">
            <PlaceholderSlot name="quote" value={slots.quote}>
              <blockquote className="text-lg font-medium italic text-gray-700">
                &ldquo;{slots.quote as string}&rdquo;
              </blockquote>
            </PlaceholderSlot>
            {!!(slots.attribution) && (
              <PlaceholderSlot name="attribution" value={slots.attribution}>
                <cite className="mt-2 block text-sm not-italic text-gray-500">
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
