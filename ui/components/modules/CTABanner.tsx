/**
 * CTABanner — full-width conversion prompt.
 * split variant: text left / CTAs right.
 * centered variant: stacked center.
 * Always dark — palette_map assigns dark across all funnel stages.
 */

import type { ComponentSlots, CTAButtonSlot, PaletteMode } from "@/lib/types";
import { getPalette } from "@/lib/palette";
import { PlaceholderSlot } from "@/components/blocks/PlaceholderSlot";
import { CTAButton } from "@/components/blocks/CTAButton";
import { TrustSignal } from "@/components/blocks/TrustSignal";

interface CTABannerProps {
  slots: ComponentSlots;
  variant: string | null;
  palette?: PaletteMode;
  slotVisibility?: Record<string, boolean>;
  layout?: { align?: "left" | "center" };
}

export function CTABanner({ slots, variant, palette, slotVisibility, layout }: CTABannerProps) {
  const p = getPalette(palette ?? "dark");
  const isSplit = variant === "split";
  const isVisible = (name: string) => slotVisibility?.[name] !== false;
  // Explicit direction — not additive. Naturally centered; left overrides.
  const isLeft = layout?.align === "left";
  const textAlign = isLeft ? "text-left" : "text-center";
  // For non-split stacked layout: cross-axis alignment of children in flex-col
  const containerAlign = isLeft ? "items-start" : "items-center";

  return (
    <section className={`${p.bg} py-20`}>
      <div className="mx-auto max-w-6xl px-6">
        <div className={`flex flex-col gap-8 ${isSplit ? "md:flex-row md:items-center md:justify-between" : containerAlign}`}>
          {/* Text */}
          <div className={`flex flex-col gap-3 ${isSplit ? "md:max-w-lg" : "max-w-xl"} ${textAlign}`}>
            <PlaceholderSlot name="headline" value={slots.headline}>
              <h2 className={`text-3xl font-bold tracking-tight ${p.text}`}>
                {slots.headline as string}
              </h2>
            </PlaceholderSlot>

            {isVisible("subhead") && (
              <PlaceholderSlot name="subhead" value={slots.subhead}>
                <p className={`text-lg ${p.subtext}`}>{slots.subhead as string}</p>
              </PlaceholderSlot>
            )}

            {isVisible("trust_signal") && (
              <TrustSignal value={slots.trust_signal as string | null} palette={palette ?? "dark"} />
            )}
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap gap-3">
            <PlaceholderSlot name="cta_primary" value={slots.cta_primary} inline>
              <CTAButton
                label={(slots.cta_primary as CTAButtonSlot).label}
                href={(slots.cta_primary as CTAButtonSlot).href}
                variant={(slots.cta_primary as CTAButtonSlot).variant ?? "secondary"}
                size="lg"
              />
            </PlaceholderSlot>
            {isVisible("cta_secondary") && (
              <PlaceholderSlot name="cta_secondary" value={slots.cta_secondary} inline>
                {slots.cta_secondary != null && (
                  <CTAButton
                    label={(slots.cta_secondary as CTAButtonSlot).label}
                    href={(slots.cta_secondary as CTAButtonSlot).href}
                    variant={(slots.cta_secondary as CTAButtonSlot).variant ?? "ghost"}
                    size="lg"
                  />
                )}
              </PlaceholderSlot>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
