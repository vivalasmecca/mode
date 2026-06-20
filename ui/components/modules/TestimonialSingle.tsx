"use client";

/**
 * TestimonialSingle — single featured testimonial with attribution.
 * Center-aligned, italic quote. AuthorLockup with optional photo.
 * Variants: quote-only | with-photo | with-company-logo
 */

import type { ComponentSlots, PaletteMode } from "@/lib/types";
import { getPalette } from "@/lib/palette";
import { PlaceholderSlot } from "@/components/blocks/PlaceholderSlot";
import { AuthorLockup } from "@/components/blocks/AuthorLockup";

interface TestimonialSingleProps {
  slots: ComponentSlots;
  variant: string | null;
  palette?: PaletteMode;
  slotVisibility?: Record<string, boolean>;
  layout?: { align?: "left" | "center" };
}

export function TestimonialSingle({ slots, variant, palette, slotVisibility, layout }: TestimonialSingleProps) {
  const p = getPalette(palette);
  const isVisible = (name: string) => slotVisibility?.[name] !== false;
  // Naturally center-aligned — "left" override switches, default stays center
  const isLeft = layout?.align === "left";
  const textAlign = isLeft ? "text-left" : "text-center";
  const justifyContent = isLeft ? "justify-start" : "justify-center";
  const showPhoto = variant === "with-photo" && isVisible("photo");
  const photo = showPhoto ? (slots.photo as string | null) : null;

  return (
    <section className={`${p.bg} py-20`}>
      <div className={`mx-auto max-w-3xl px-6 ${textAlign}`}>
        <PlaceholderSlot name="quote" value={slots.quote}>
          <blockquote className={`text-xl font-medium italic leading-relaxed ${p.text}`}>
            &ldquo;{slots.quote as string}&rdquo;
          </blockquote>
        </PlaceholderSlot>

        <div className={`mt-8 flex ${justifyContent}`}>
          <PlaceholderSlot name="author_name" value={slots.author_name}>
            <AuthorLockup
              name={slots.author_name as string}
              title={isVisible("author_title") ? (slots.author_title as string | null) : null}
              company={isVisible("company") ? (slots.company as string | null) : null}
              photo={photo}
              palette={palette}
            />
          </PlaceholderSlot>
        </div>

        {isVisible("company_logo") && variant === "with-company-logo" && (
          <div className="mt-6">
            <PlaceholderSlot name="company_logo" value={slots.company_logo}>
              {slots.company_logo != null && (
                <img
                  src={slots.company_logo as string}
                  alt="Company logo"
                  className="mx-auto h-6 w-auto grayscale opacity-50"
                />
              )}
            </PlaceholderSlot>
          </div>
        )}
      </div>
    </section>
  );
}
