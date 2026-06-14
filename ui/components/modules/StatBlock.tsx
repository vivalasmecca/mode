/**
 * StatBlock — high-impact metric clusters for scale, outcome, or momentum.
 * Variants: 3-stat | 4-stat | with-source
 *
 * with-source: shows source attribution per stat (required for Validator contexts).
 * 3-stat / 4-stat: pure metric impact, no source, controls grid columns.
 * headline is always optional — suppressed when null.
 */

import type { ComponentSlots, Stat } from "@/lib/types";
import { PlaceholderSlot, isPlaceholderValue } from "@/components/blocks/PlaceholderSlot";

interface StatBlockProps {
  slots: ComponentSlots;
  variant: string | null;
}

function StatUnit({ stat, showSource }: { stat: Stat; showSource: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-4xl font-bold tracking-tight text-gray-900">{stat.value}</span>
      <span className="text-sm font-medium text-gray-600">{stat.label}</span>
      {showSource && stat.source && (
        <span className="text-xs text-gray-400">{stat.source}</span>
      )}
    </div>
  );
}

export function StatBlock({ slots, variant }: StatBlockProps) {
  const showSource = variant === "with-source";
  const cols = variant === "4-stat" ? "sm:grid-cols-4" : "sm:grid-cols-3";

  const rawStats = Array.isArray(slots.stats) ? slots.stats as Stat[] : [];

  return (
    <section className="border-y border-gray-100 bg-white py-16">
      <div className="mx-auto max-w-6xl px-6">
        {!isPlaceholderValue(slots.headline) && (
          <PlaceholderSlot name="headline" value={slots.headline}>
            <p className="mb-10 text-center text-xs font-semibold uppercase tracking-widest text-gray-400">
              {slots.headline as string}
            </p>
          </PlaceholderSlot>
        )}

        {rawStats.length > 0 ? (
          <div className={`grid grid-cols-1 gap-10 text-center ${cols}`}>
            {rawStats.map((stat, i) => (
              <StatUnit key={i} stat={stat} showSource={showSource} />
            ))}
          </div>
        ) : (
          <div className={`grid grid-cols-1 gap-10 text-center ${cols}`}>
            {Array.from({ length: variant === "4-stat" ? 4 : 3 }).map((_, i) => (
              <PlaceholderSlot key={i} name={`stats[${i}]`} value={null} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
