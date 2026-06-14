"use client";

/**
 * AuthorLockup — name, title, company, optional photo.
 * Uses Radix Avatar for circular crop with initial fallback.
 * Accepts palette to invert text colors on dark sections.
 */

import * as Avatar from "@radix-ui/react-avatar";
import type { PaletteMode } from "@/lib/types";

interface AuthorLockupProps {
  name: string;
  title?: string | null;
  company?: string | null;
  photo?: string | null;
  palette?: PaletteMode;
}

export function AuthorLockup({ name, title, company, photo, palette }: AuthorLockupProps) {
  const isDark = palette === "dark";
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-center gap-3">
      <Avatar.Root className="inline-flex h-10 w-10 shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-gray-200">
        {photo && (
          <Avatar.Image
            src={photo}
            alt={name}
            className="h-full w-full object-cover"
          />
        )}
        <Avatar.Fallback className="flex h-full w-full items-center justify-center text-sm font-semibold text-gray-600">
          {initials}
        </Avatar.Fallback>
      </Avatar.Root>
      <div>
        <p className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>{name}</p>
        {(title || company) && (
          <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            {title}
            {title && company ? ", " : ""}
            {company}
          </p>
        )}
      </div>
    </div>
  );
}
