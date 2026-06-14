/**
 * CTABanner — full-width conversion prompt.
 * split variant: text left / CTAs right.
 * centered variant: stacked center.
 * Dark background section.
 */

import type { ComponentSlots } from "@/lib/types";
import { PlaceholderSlot } from "@/components/blocks/PlaceholderSlot";
import { CTAButton } from "@/components/blocks/CTAButton";
import { TrustSignal } from "@/components/blocks/TrustSignal";

interface CTABannerProps {
  slots: ComponentSlots;
  variant: string | null;
}

export function CTABanner({ slots, variant }: CTABannerProps) {
  const isSplit = variant === "split";

  return (
    <section className="bg-gray-900 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className={`flex flex-col gap-8 ${isSplit ? "md:flex-row md:items-center md:justify-between" : "items-center text-center"}`}>
          {/* Text */}
          <div className={`flex flex-col gap-3 ${isSplit ? "md:max-w-lg" : "max-w-xl"}`}>
            <PlaceholderSlot name="headline" value={slots.headline}>
              <h2 className="text-3xl font-bold tracking-tight text-white">
                {slots.headline as string}
              </h2>
            </PlaceholderSlot>

            {slots.subhead !== undefined && (
              <PlaceholderSlot name="subhead" value={slots.subhead}>
                <p className="text-lg text-gray-300">{slots.subhead as string}</p>
              </PlaceholderSlot>
            )}

            <TrustSignal value={slots.trust_signal as string | null} />
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap gap-3">
            <PlaceholderSlot name="cta_primary" value={slots.cta_primary} inline>
              <CTAButton label="Start free trial" size="lg" variant="secondary" />
            </PlaceholderSlot>
            {slots.cta_secondary !== undefined && (
              <PlaceholderSlot name="cta_secondary" value={slots.cta_secondary} inline>
                <CTAButton label="Talk to sales" size="lg" variant="ghost" />
              </PlaceholderSlot>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
