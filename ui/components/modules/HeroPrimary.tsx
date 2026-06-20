/**
 * HeroPrimary — page-opening statement above the fold.
 * with-social-proof variant adds LogoStrip below CTAs.
 * text-only variant hides media slot.
 */

import type { ComponentSlots, CTAButtonSlot, PaletteMode } from "@/lib/types";
import { getPalette } from "@/lib/palette";
import { PlaceholderSlot } from "@/components/blocks/PlaceholderSlot";
import { CTAButton } from "@/components/blocks/CTAButton";
import { TrustSignal } from "@/components/blocks/TrustSignal";
import { LogoStrip } from "@/components/blocks/LogoStrip";

interface HeroPrimaryProps {
  slots: ComponentSlots;
  variant: string | null;
  palette?: PaletteMode;
  slotVisibility?: Record<string, boolean>;
  layout?: { align?: "left" | "center" };
}

/** Normalize a CTA slot that may be a string (LLM error) or a proper object. */
function asCTA(slot: unknown): CTAButtonSlot | null {
  if (slot == null) return null;
  if (typeof slot === "string") return { label: slot, href: "#" };
  if (typeof slot === "object" && "label" in (slot as object)) return slot as CTAButtonSlot;
  return null;
}

export function HeroPrimary({ slots, variant, palette, slotVisibility, layout }: HeroPrimaryProps) {
  const p = getPalette(palette);
  const isEditorial = variant === "editorial";
  const showMedia = !isEditorial && variant !== "text-only";
  const showLogos = variant === "with-social-proof";
  const logos = Array.isArray(slots.logos) ? slots.logos : [];
  const isVisible = (name: string) => slotVisibility?.[name] !== false;
  const alignClass = layout?.align === "center" ? "text-center items-center" : "";

  // Editorial: full-width centered, dominant headline, eyebrow, generous breathing room
  if (isEditorial) {
    return (
      <section className={`${p.bg} py-32 md:py-44`}>
        <div className="mx-auto max-w-5xl px-6 text-center">
          <div className={`flex flex-col gap-8 ${alignClass || "items-center"}`}>
            {isVisible("eyebrow") && (
              <PlaceholderSlot name="eyebrow" value={slots.eyebrow} inline>
                <p className={`text-xs font-semibold uppercase tracking-widest ${p.muted}`}>
                  {slots.eyebrow as string}
                </p>
              </PlaceholderSlot>
            )}

            <PlaceholderSlot name="headline" value={slots.headline}>
              <h1 className={`text-6xl font-bold tracking-tight leading-none md:text-7xl lg:text-8xl ${p.text}`}>
                {slots.headline as string}
              </h1>
            </PlaceholderSlot>

            {isVisible("subhead") && (
              <PlaceholderSlot name="subhead" value={slots.subhead}>
                <p className={`max-w-2xl text-xl leading-relaxed ${p.subtext}`}>
                  {slots.subhead as string}
                </p>
              </PlaceholderSlot>
            )}

            <div className="flex flex-col items-center gap-4">
              <div className="flex flex-wrap justify-center gap-3">
                {isVisible("cta_primary") && (
                  <PlaceholderSlot name="cta_primary" value={slots.cta_primary} inline>
                    {slots.cta_primary != null && (
                      <CTAButton
                        label={(slots.cta_primary as CTAButtonSlot).label}
                        href={(slots.cta_primary as CTAButtonSlot).href}
                        variant={(slots.cta_primary as CTAButtonSlot).variant ?? "primary"}
                        size="lg"
                      />
                    )}
                  </PlaceholderSlot>
                )}
                {isVisible("cta_secondary") && (
                  <PlaceholderSlot name="cta_secondary" value={slots.cta_secondary} inline>
                    {asCTA(slots.cta_secondary) && (
                      <CTAButton
                        label={asCTA(slots.cta_secondary)!.label}
                        href={asCTA(slots.cta_secondary)!.href}
                        variant={asCTA(slots.cta_secondary)!.variant ?? "secondary"}
                        size="lg"
                      />
                    )}
                  </PlaceholderSlot>
                )}
              </div>
              {isVisible("trust_signal") && (
                <TrustSignal value={slots.trust_signal as string | null} palette={palette} />
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`${p.bg} py-20 md:py-28`}>
      <div className="mx-auto max-w-6xl px-6">
        <div className={`flex flex-col gap-8 ${showMedia ? "md:flex-row md:items-center" : ""} ${alignClass}`}>
          {/* Text side */}
          <div className={`flex flex-col gap-6 ${showMedia ? "md:max-w-xl" : ""} ${alignClass}`}>
            <PlaceholderSlot name="headline" value={slots.headline}>
              <h1 className={`text-4xl font-bold tracking-tight md:text-5xl leading-tight ${p.text}`}>
                {slots.headline as string}
              </h1>
            </PlaceholderSlot>

            {isVisible("subhead") && (
              <PlaceholderSlot name="subhead" value={slots.subhead}>
                <p className={`text-lg leading-relaxed ${p.subtext}`}>{slots.subhead as string}</p>
              </PlaceholderSlot>
            )}

            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-3">
                {isVisible("cta_primary") && (
                  <PlaceholderSlot name="cta_primary" value={slots.cta_primary} inline>
                    {slots.cta_primary != null && (
                      <CTAButton
                        label={(slots.cta_primary as CTAButtonSlot).label}
                        href={(slots.cta_primary as CTAButtonSlot).href}
                        variant={(slots.cta_primary as CTAButtonSlot).variant ?? "primary"}
                        size="lg"
                      />
                    )}
                  </PlaceholderSlot>
                )}
                {isVisible("cta_secondary") && (
                  <PlaceholderSlot name="cta_secondary" value={slots.cta_secondary} inline>
                    {asCTA(slots.cta_secondary) && (
                      <CTAButton
                        label={asCTA(slots.cta_secondary)!.label}
                        href={asCTA(slots.cta_secondary)!.href}
                        variant={asCTA(slots.cta_secondary)!.variant ?? "secondary"}
                        size="lg"
                      />
                    )}
                  </PlaceholderSlot>
                )}
              </div>

              {isVisible("trust_signal") && (
                <TrustSignal value={slots.trust_signal as string | null} palette={palette} />
              )}

              {isVisible("logos") && showLogos && (
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
