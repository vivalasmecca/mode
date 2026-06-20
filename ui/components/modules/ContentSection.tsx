/**
 * ContentSection — long-form body content for Validator/Explorer pages.
 * standard:      headline + body prose, optional CTA below.
 * with-sidebar:  body left, callout pulled into a sidebar panel right.
 * with-callout:  body with highlighted callout block inline before CTA.
 */

import type { ComponentSlots, CTAButtonSlot, PaletteMode } from "@/lib/types";
import { getPalette } from "@/lib/palette";
import { PlaceholderSlot } from "@/components/blocks/PlaceholderSlot";
import { CTAButton } from "@/components/blocks/CTAButton";

interface ContentSectionProps {
  slots: ComponentSlots;
  variant: string | null;
  palette?: PaletteMode;
  slotVisibility?: Record<string, boolean>;
  layout?: { align?: "left" | "center" };
}

export function ContentSection({ slots, variant, palette, slotVisibility }: ContentSectionProps) {
  const p = getPalette(palette ?? "light");
  const isSidebar = variant === "with-sidebar";
  const isCallout = variant === "with-callout";
  const isVisible = (name: string) => slotVisibility?.[name] !== false;

  const cta = slots.cta as CTAButtonSlot | null;

  return (
    <section className={`${p.bg} py-20`}>
      <div className="mx-auto max-w-6xl px-6">
        {/* Headline — always full width */}
        <div className="mb-10 max-w-3xl">
          <PlaceholderSlot name="headline" value={slots.headline}>
            <h2 className={`text-3xl font-bold tracking-tight md:text-4xl ${p.text}`}>
              {slots.headline as string}
            </h2>
          </PlaceholderSlot>
        </div>

        {/* Body area */}
        {isSidebar ? (
          <div className="flex flex-col gap-10 md:flex-row md:gap-16">
            {/* Body — prose column */}
            <div className="flex-1">
              <PlaceholderSlot name="body" value={slots.body}>
                <p className={`text-base leading-relaxed whitespace-pre-wrap ${p.subtext}`}>
                  {slots.body as string}
                </p>
              </PlaceholderSlot>
            </div>

            {/* Sidebar callout */}
            {isVisible("callout") && (
              <aside className={`md:w-64 shrink-0 rounded-xl border ${p.border} px-6 py-5`}>
                <PlaceholderSlot name="callout" value={slots.callout}>
                  <p className={`text-sm leading-relaxed ${p.subtext}`}>
                    {slots.callout as string}
                  </p>
                </PlaceholderSlot>
              </aside>
            )}
          </div>
        ) : (
          <div className="max-w-3xl flex flex-col gap-8">
            <PlaceholderSlot name="body" value={slots.body}>
              <p className={`text-base leading-relaxed whitespace-pre-wrap ${p.subtext}`}>
                {slots.body as string}
              </p>
            </PlaceholderSlot>

            {/* Inline callout block */}
            {isCallout && isVisible("callout") && (
              <PlaceholderSlot name="callout" value={slots.callout}>
                <blockquote className={`border-l-4 ${p.border} pl-5 py-1`}>
                  <p className={`text-base font-medium leading-relaxed ${p.text}`}>
                    {slots.callout as string}
                  </p>
                </blockquote>
              </PlaceholderSlot>
            )}

            {/* CTA */}
            {isVisible("cta") && cta != null && (
              <div>
                <CTAButton
                  label={cta.label}
                  href={cta.href}
                  variant={cta.variant ?? "secondary"}
                  size="md"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
