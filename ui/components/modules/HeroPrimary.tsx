/**
 * HeroPrimary — page-opening statement above the fold.
 * with-social-proof variant adds LogoStrip below CTAs.
 * text-only variant hides media slot.
 */

import type { ComponentSlots, PaletteMode } from "@/lib/types";
import { getPalette } from "@/lib/palette";
import { PlaceholderSlot } from "@/components/blocks/PlaceholderSlot";
import { CTAButton } from "@/components/blocks/CTAButton";
import { TrustSignal } from "@/components/blocks/TrustSignal";
import { LogoStrip } from "@/components/blocks/LogoStrip";

interface HeroPrimaryProps {
  slots: ComponentSlots;
  variant: string | null;
  palette?: PaletteMode;
}

export function HeroPrimary({ slots, variant, palette }: HeroPrimaryProps) {
  const p = getPalette(palette);
  const showMedia = variant !== "text-only";
  const showLogos = variant === "with-social-proof";
  const logos = Array.isArray(slots.logos) ? slots.logos : [];

  return (
    <section className={`${p.bg} py-20 md:py-28`}>
      <div className="mx-auto max-w-6xl px-6">
        <div className={`flex flex-col gap-8 ${showMedia ? "md:flex-row md:items-center" : ""}`}>
          {/* Text side */}
          <div className="flex flex-col gap-6 md:max-w-xl">
            <PlaceholderSlot name="headline" value={slots.headline}>
              <h1 className={`text-4xl font-bold tracking-tight md:text-5xl leading-tight ${p.text}`}>
                {slots.headline as string}
              </h1>
            </PlaceholderSlot>

            <PlaceholderSlot name="subhead" value={slots.subhead}>
              <p className={`text-lg leading-relaxed ${p.subtext}`}>{slots.subhead as string}</p>
            </PlaceholderSlot>

            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-3">
                <PlaceholderSlot name="cta_primary" value={slots.cta_primary} inline>
                  <CTAButton label="Start free trial" size="lg" />
                </PlaceholderSlot>
                {slots.cta_secondary !== undefined && (
                  <PlaceholderSlot name="cta_secondary" value={slots.cta_secondary} inline>
                    <CTAButton label="See how it works" variant="secondary" size="lg" />
                  </PlaceholderSlot>
                )}
              </div>

              <TrustSignal value={slots.trust_signal as string | null} palette={palette} />

              {showLogos && (
                <div className="mt-4">
                  <p className={`mb-3 text-xs font-medium uppercase tracking-widest ${p.muted}`}>
                    Trusted by
                  </p>
                  <LogoStrip logos={logos as []} />
                </div>
              )}
            </div>
          </div>

          {/* Media side */}
          {showMedia && (
            <div className="flex-1">
              <PlaceholderSlot name="media" value={slots.media}>
                <div className="aspect-video w-full rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                  media
                </div>
              </PlaceholderSlot>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
