"use client";

/**
 * NavigationHeader — global navigation with logo, nav links, and CTAs.
 * Uses Radix NavigationMenu. minimal variant hides nav_links.
 */

import * as NavigationMenu from "@radix-ui/react-navigation-menu";
import type { ComponentSlots, CTAButtonSlot, PaletteMode } from "@/lib/types";
import { PlaceholderSlot, isPlaceholderValue } from "@/components/blocks/PlaceholderSlot";
import { CTAButton } from "@/components/blocks/CTAButton";

interface NavigationHeaderProps {
  slots: ComponentSlots;
  variant: string | null;
  palette?: PaletteMode; // chrome — always light regardless of page palette
}

export function NavigationHeader({ slots, variant, palette: _palette }: NavigationHeaderProps) {
  const isMinimal = variant === "minimal";
  const navLinks = Array.isArray(slots.nav_links) ? slots.nav_links : [];

  return (
    <nav className="w-full border-b border-gray-100 bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        {/* Logo */}
        <div className="flex items-center gap-8">
          <img src="/wordmark.svg" alt="Logo" className="h-7 w-auto" />

          {/* Nav links */}
          {!isMinimal && navLinks.length > 0 && (
            <NavigationMenu.Root>
              <NavigationMenu.List className="flex items-center gap-6">
                {navLinks.map((link: { label?: string; href?: string }, i: number) => (
                  <NavigationMenu.Item key={i}>
                    <NavigationMenu.Link
                      href={link.href ?? "#"}
                      className="text-sm text-gray-600 transition-colors hover:text-gray-900"
                    >
                      {link.label}
                    </NavigationMenu.Link>
                  </NavigationMenu.Item>
                ))}
              </NavigationMenu.List>
            </NavigationMenu.Root>
          )}

          {!isMinimal && navLinks.length === 0 && (
            <PlaceholderSlot name="nav_links" value="[nav_links]" />
          )}
        </div>

        {/* CTAs */}
        <div className="flex items-center gap-3">
          {!isMinimal && !isPlaceholderValue(slots.cta_secondary) && (
            <CTAButton
              label={(slots.cta_secondary as CTAButtonSlot).label}
              href={(slots.cta_secondary as CTAButtonSlot).href}
              variant={(slots.cta_secondary as CTAButtonSlot).variant ?? "ghost"}
              size="sm"
            />
          )}
          <PlaceholderSlot name="cta_primary" value={slots.cta_primary} inline>
            <CTAButton
              label={(slots.cta_primary as CTAButtonSlot).label}
              href={(slots.cta_primary as CTAButtonSlot).href}
              variant={(slots.cta_primary as CTAButtonSlot).variant ?? "primary"}
              size="sm"
            />
          </PlaceholderSlot>
        </div>
      </div>
    </nav>
  );
}
