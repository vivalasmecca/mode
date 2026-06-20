/**
 * StatBlock — high-impact metric clusters for scale, outcome, or momentum.
 * Variants: 3-stat | 4-stat | with-source
 *
 * with-source: shows source attribution per stat (required for Validator contexts).
 * 3-stat / 4-stat: pure metric impact, no source, controls grid columns.
 * headline is always optional — suppressed when null.
 */

import type { ComponentSlots, Stat, PaletteMode } from "@/lib/types";
import { getPalette } from "@/lib/palette";
import { PlaceholderSlot } from "@/components/blocks/PlaceholderSlot";

interface StatBlockProps {
  slots: ComponentSlots;
  variant: string | null;
  palette?: PaletteMode;
  slotVisibility?: Record<string, boolean>;
  layout?: { align?: "left" | "center" };
}

function StatUnit({ stat, showSource, p }: {
  stat: Stat;
  showSource: boolean;
  p: ReturnType<typeof getPalette>;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className={`text-4xl font-bold tracking-tight ${p.text}`}>{stat.value}</span>
      <span className={`text-sm font-medium ${p.subtext}`}>{stat.label}</span>
      {showSource && stat.source && (
        <span className={`text-xs ${p.muted}`}>{stat.source}</span>
      )}
    </div>
  );
}

export function StatBlock({ slots, variant, palette, slotVisibility, layout }: StatBlockProps) {
  const p = getPalette(palette);
  const isVisible = (name: string) => slotVisibility?.[name] !== false;
  // Explicit direction — not additive. Naturally centered; left overrides.
  const isLeft = layout?.align === "left";
  const textAlign = isLeft ? "text-left" : "text-center";
  const showSource = variant === "with-source";
  const cols = variant === "4-stat" ? "sm:grid-cols-4" : "sm:grid-cols-3";

  const rawStats = Array.isArray(slots.stats) ? slots.stats as Stat[] : [];

  return (
    <section className={`border-y ${p.border} ${p.bg} py-16`}>
      <div className="mx-auto max-w-6xl px-6">
        {isVisible("headline") && (
          <PlaceholderSlot name="headline" value={slots.headline}>
            <p className={`mb-10 ${textAlign} text-xs font-semibold uppercase tracking-widest ${p.muted}`}>
              {slots.headline as string}
            </p>
          </PlaceholderSlot>
        )}

        {rawStats.length > 0 ? (
          <div className={`grid grid-cols-1 gap-10 ${textAlign} ${cols}`}>
            {rawStats.map((stat, i) => (
              <StatUnit key={i} stat={stat} showSource={showSource} p={p} />
            ))}
          </div>
        ) : (
          <div className={`grid grid-cols-1 gap-10 ${textAlign} ${cols}`}>
            {Array.from({ length: variant === "4-stat" ? 4 : 3 }).map((_, i) => (
              <PlaceholderSlot key={i} name={`stats[${i}]`} value={null} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
