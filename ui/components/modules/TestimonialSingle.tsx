"use client";

/**
 * TestimonialSingle — single featured testimonial with attribution.
 * Center-aligned, italic quote. AuthorLockup with optional photo.
 * Variants: quote-only | with-photo | with-company-logo
 */

import type { ComponentSlots } from "@/lib/types";
import { PlaceholderSlot } from "@/components/blocks/PlaceholderSlot";
import { AuthorLockup } from "@/components/blocks/AuthorLockup";

interface TestimonialSingleProps {
  slots: ComponentSlots;
  variant: string | null;
}

export function TestimonialSingle({ slots, variant }: TestimonialSingleProps) {
  const showPhoto = variant === "with-photo";
  const photo = showPhoto ? (slots.photo as string | null) : null;

  return (
    <section className="bg-gray-50 py-20">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <PlaceholderSlot name="quote" value={slots.quote}>
          <blockquote className="text-xl font-medium italic leading-relaxed text-gray-800">
            &ldquo;{slots.quote as string}&rdquo;
          </blockquote>
        </PlaceholderSlot>

        <div className="mt-8 flex justify-center">
          <PlaceholderSlot name="author_name" value={slots.author_name}>
            <AuthorLockup
              name={slots.author_name as string}
              title={slots.author_title as string | null}
              company={slots.company as string | null}
              photo={photo}
            />
          </PlaceholderSlot>
        </div>

        {variant === "with-company-logo" && !!(slots.company_logo) && (
          <div className="mt-6">
            <PlaceholderSlot name="company_logo" value={slots.company_logo}>
              <img
                src={slots.company_logo as string}
                alt="Company logo"
                className="mx-auto h-6 w-auto grayscale opacity-50"
              />
            </PlaceholderSlot>
          </div>
        )}
      </div>
    </section>
  );
}
