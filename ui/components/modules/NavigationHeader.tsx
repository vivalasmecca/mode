"use client";

/**
 * NavigationHeader — global navigation with logo, nav links, and CTAs.
 * Uses Radix NavigationMenu. minimal variant hides nav_links.
 */

import * as NavigationMenu from "@radix-ui/react-navigation-menu";
import type { ComponentSlots } from "@/lib/types";
import { PlaceholderSlot, isPlaceholderValue } from "@/components/blocks/PlaceholderSlot";
import { CTAButton } from "@/components/blocks/CTAButton";

interface NavigationHeaderProps {
  slots: ComponentSlots;
  variant: string | null;
}

export function NavigationHeader({ slots, variant }: NavigationHeaderProps) {
  const isMinimal = variant === "minimal";
  const navLinks = Array.isArray(slots.nav_links) ? slots.nav_links : [];

  return (
    <nav className="w-full border-b border-gray-100 bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        {/* Logo */}
        <div className="flex items-center gap-8">
          <PlaceholderSlot name="logo" value={slots.logo} inline>
            <div className="font-bold text-lg text-gray-900">Logo</div>
          </PlaceholderSlot>

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
            <CTAButton label="Log in" variant="ghost" size="sm" />
          )}
          <PlaceholderSlot name="cta_primary" value={slots.cta_primary} inline>
            <CTAButton label="Get Started" size="sm" />
          </PlaceholderSlot>
        </div>
      </div>
    </nav>
  );
}
