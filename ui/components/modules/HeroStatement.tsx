/**
 * HeroStatement — text-heavy opening for pages where the argument is the product.
 * No media. Designed for thought leadership, philosophy, and narrative-led pages.
 *
 * centered:     centered, essay feel — maximum breathing room.
 * left-aligned: left-aligned, more direct and authoritative.
 * with-eyebrow: eyebrow anchors context before the headline lands.
 */

import type { ComponentSlots, CTAButtonSlot, PaletteMode } from "@/lib/types";
import { getPalette } from "@/lib/palette";
import { PlaceholderSlot } from "@/components/blocks/PlaceholderSlot";
import { CTAButton } from "@/components/blocks/CTAButton";

interface HeroStatementProps {
  slots: ComponentSlots;
  variant: string | null;
  palette?: PaletteMode;
  slotVisibility?: Record<string, boolean>;
  layout?: { align?: "left" | "center" };
}

function asCTA(slot: unknown): CTAButtonSlot | null {
  if (slot == null) return null;
  if (typeof slot === "string") return { label: slot, href: "#" };
  if (typeof slot === "object" && "label" in (slot as object)) return slot as CTAButtonSlot;
  return null;
}

export function HeroStatement({ slots, variant, palette, slotVisibility }: HeroStatementProps) {
  const p = getPalette(palette ?? "light");
  const isLeftAligned = variant === "left-aligned";
  const showEyebrow = variant === "with-eyebrow" || slots.eyebrow != null;
  const isVisible = (name: string) => slotVisibility?.[name] !== false;

  const align = isLeftAligned ? "items-start text-left" : "items-center text-center";
  const maxW = isLeftAligned ? "max-w-3xl" : "max-w-3xl mx-auto";

  return (
    <section className={`${p.bg} py-28 md:py-36`}>
      <div className="mx-auto max-w-5xl px-6">
        <div className={`flex flex-col gap-8 ${align}`}>
          {/* Eyebrow */}
          {showEyebrow && isVisible("eyebrow") && (
            <PlaceholderSlot name="eyebrow" value={slots.eyebrow} inline>
              <p className={`text-xs font-semibold uppercase tracking-widest ${p.muted}`}>
                {slots.eyebrow as string}
              </p>
            </PlaceholderSlot>
          )}

          {/* Headline */}
          <div className={maxW}>
            <PlaceholderSlot name="headline" value={slots.headline}>
              <h1 className={`text-5xl font-bold tracking-tight leading-tight md:text-6xl ${p.text}`}>
                {slots.headline as string}
              </h1>
            </PlaceholderSlot>
          </div>

          {/* Subhead */}
          {isVisible("subhead") && (
            <div className={maxW}>
              <PlaceholderSlot name="subhead" value={slots.subhead}>
                <p className={`text-xl leading-relaxed ${p.subtext}`}>
                  {slots.subhead as string}
                </p>
              </PlaceholderSlot>
            </div>
          )}

          {/* Body — optional long-form paragraph */}
          {isVisible("body") && (
            <PlaceholderSlot name="body" value={slots.body}>
              <p className={`max-w-2xl text-base leading-relaxed ${p.subtext}`}>
                {slots.body as string}
              </p>
            </PlaceholderSlot>
          )}

          {/* CTAs */}
          <div className="flex flex-wrap gap-3">
            <PlaceholderSlot name="cta_primary" value={slots.cta_primary} inline>
              {asCTA(slots.cta_primary) && (
                <CTAButton
                  label={asCTA(slots.cta_primary)!.label}
                  href={asCTA(slots.cta_primary)!.href}
                  variant={asCTA(slots.cta_primary)!.variant ?? "primary"}
                  size="lg"
                />
              )}
            </PlaceholderSlot>

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
        </div>
      </div>
    </section>
  );
}
