"use client";

/**
 * PricingCard — conversion-optimized pricing display. One plan per card.
 * Uses Radix Separator. highlighted variant inverts card to dark background.
 * Section background is palette-driven; card interior is variant-driven.
 * Variants: highlighted | standard | with-comparison
 */

import * as Separator from "@radix-ui/react-separator";
import type { ComponentSlots, CTAButtonSlot, PaletteMode } from "@/lib/types";
import { getPalette } from "@/lib/palette";
import { PlaceholderSlot } from "@/components/blocks/PlaceholderSlot";
import { CTAButton } from "@/components/blocks/CTAButton";
import { PriceDisplay } from "@/components/blocks/PriceDisplay";

interface PricingCardProps {
  slots: ComponentSlots;
  variant: string | null;
  palette?: PaletteMode;
  slotVisibility?: Record<string, boolean>;
  layout?: { align?: "left" | "center" };
}

export function PricingCard({ slots, variant, palette, slotVisibility, layout }: PricingCardProps) {
  const p = getPalette(palette);
  const isVisible = (name: string) => slotVisibility?.[name] !== false;
  const alignClass = layout?.align === "center" ? "text-center items-center" : "";
  const isHighlighted = variant === "highlighted";
  const features = Array.isArray(slots.features) ? (slots.features as string[]) : [];

  // Card interior styling is variant-driven, independent of section palette
  const cardClass = isHighlighted
    ? "bg-gray-900 text-white"
    : "bg-white border border-gray-200";

  const textMuted = isHighlighted ? "text-gray-300" : "text-gray-500";
  const textBody = isHighlighted ? "text-white" : "text-gray-900";
  const sepColor = isHighlighted ? "bg-gray-700" : "bg-gray-100";

  return (
    <section className={`${p.bg} py-20`}>
      <div className={`mx-auto max-w-6xl px-6 ${alignClass}`}>
        <div className={`mx-auto max-w-sm rounded-2xl p-8 shadow-sm ${cardClass}`}>
          {/* Plan name + badge */}
          <div className="flex items-center justify-between">
            <PlaceholderSlot name="plan_name" value={slots.plan_name} inline>
              <p className={`font-semibold ${textBody}`}>{slots.plan_name as string}</p>
            </PlaceholderSlot>
            {isVisible("badge") && (
              <PlaceholderSlot name="badge" value={slots.badge} inline>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${isHighlighted ? "bg-white text-gray-900" : "bg-gray-900 text-white"}`}>
                  {slots.badge as string}
                </span>
              </PlaceholderSlot>
            )}
          </div>

          {/* Price */}
          <div className="mt-4">
            <PlaceholderSlot name="price" value={slots.price}>
              <PriceDisplay
                price={slots.price as string}
                billingPeriod={slots.billing_period as string ?? "mo"}
                badge={null}
              />
            </PlaceholderSlot>
          </div>

          {/* Description */}
          {isVisible("description") && (
            <div className="mt-3">
              <PlaceholderSlot name="description" value={slots.description}>
                <p className={`text-sm leading-relaxed ${textMuted}`}>{slots.description as string}</p>
              </PlaceholderSlot>
            </div>
          )}

          <Separator.Root className={`my-6 h-px ${sepColor}`} />

          {/* Feature list */}
          {features.length > 0 ? (
            <ul className="space-y-2">
              {features.map((f, i) => (
                <li key={i} className={`flex items-start gap-2 text-sm ${textBody}`}>
                  <svg className={`mt-0.5 h-4 w-4 shrink-0 ${isHighlighted ? "text-gray-300" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
          ) : (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={`h-4 rounded ${isHighlighted ? "bg-gray-700" : "bg-gray-100"} animate-pulse`} style={{ width: `${70 + i * 5}%` }} />
              ))}
            </div>
          )}

          {/* CTA */}
          <div className="mt-8">
            <PlaceholderSlot name="cta" value={slots.cta}>
              <CTAButton
                label={(slots.cta as CTAButtonSlot).label}
                href={(slots.cta as CTAButtonSlot).href}
                variant={(slots.cta as CTAButtonSlot).variant ?? (isHighlighted ? "secondary" : "primary")}
                size="md"
              />
            </PlaceholderSlot>
          </div>
        </div>
      </div>
    </section>
  );
}
