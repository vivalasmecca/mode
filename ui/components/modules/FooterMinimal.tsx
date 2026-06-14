"use client";

/**
 * FooterMinimal — page close with logo, nav columns, legal, and optional recovery CTA.
 * Uses Radix Separator. with-cta variant adds a recovery CTA above nav grid.
 * Variants: standard | minimal | with-cta
 */

import * as Separator from "@radix-ui/react-separator";
import type { ComponentSlots, NavColumn, PaletteMode } from "@/lib/types";
import { PlaceholderSlot } from "@/components/blocks/PlaceholderSlot";
import { CTAButton } from "@/components/blocks/CTAButton";

interface FooterMinimalProps {
  slots: ComponentSlots;
  variant: string | null;
  palette?: PaletteMode; // chrome — always light regardless of page palette
}

export function FooterMinimal({ slots, variant, palette: _palette }: FooterMinimalProps) {
  const isMinimal = variant === "minimal";
  const hasCTA = variant === "with-cta";
  const navColumns = Array.isArray(slots.nav_columns) ? (slots.nav_columns as NavColumn[]) : [];

  return (
    <footer className="border-t border-gray-100 bg-white pt-12 pb-8">
      <div className="mx-auto max-w-6xl px-6">
        {/* Recovery CTA */}
        {hasCTA && (
          <div className="mb-10 rounded-xl bg-gray-50 px-8 py-6 flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
            <p className="font-semibold text-gray-900">Not ready yet? Save your progress.</p>
            <PlaceholderSlot name="cta" value={slots.cta} inline>
              <CTAButton label="Save for later" variant="secondary" size="sm" />
            </PlaceholderSlot>
          </div>
        )}

        {/* Logo row */}
        <div className="flex items-center justify-between">
          <PlaceholderSlot name="logo" value={slots.logo} inline>
            <div className="font-bold text-gray-900">Logo</div>
          </PlaceholderSlot>
        </div>

        {/* Nav columns */}
        {!isMinimal && navColumns.length > 0 && (
          <div className="mt-10 grid grid-cols-2 gap-8 md:grid-cols-4">
            {navColumns.map((col, i) => (
              <div key={i}>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
                  {col.heading}
                </p>
                <ul className="space-y-2">
                  {col.links.map((link, j) => (
                    <li key={j}>
                      <a href={link.href} className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {!isMinimal && navColumns.length === 0 && (
          <div className="mt-8">
            <PlaceholderSlot name="nav_columns" value="[nav_columns]" />
          </div>
        )}

        <Separator.Root className="my-8 h-px bg-gray-100" />

        {/* Legal */}
        <PlaceholderSlot name="legal_text" value={slots.legal_text}>
          <p className="text-xs text-gray-400">{slots.legal_text as string}</p>
        </PlaceholderSlot>
      </div>
    </footer>
  );
}
