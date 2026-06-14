/**
 * FeatureGrid — structured articulation of product capabilities.
 * Variants: 3-col-icon | 2-col-heavy | list-style
 * Falls back to 6 placeholder cards if features array is empty.
 */

import type { ComponentSlots, Feature } from "@/lib/types";
import { PlaceholderSlot } from "@/components/blocks/PlaceholderSlot";
import { FeatureCard } from "@/components/blocks/FeatureCard";

interface FeatureGridProps {
  slots: ComponentSlots;
  variant: string | null;
}

const PLACEHOLDER_FEATURES: Feature[] = Array.from({ length: 6 }, (_, i) => ({
  icon: "◻",
  title: `Feature ${i + 1}`,
  description: "Feature description placeholder",
}));

export function FeatureGrid({ slots, variant }: FeatureGridProps) {
  const features: Feature[] =
    Array.isArray(slots.features) && slots.features.length > 0
      ? (slots.features as Feature[])
      : PLACEHOLDER_FEATURES;

  const gridClass =
    variant === "2-col-heavy"
      ? "grid-cols-1 md:grid-cols-2"
      : variant === "list-style"
      ? "grid-cols-1 max-w-2xl"
      : "grid-cols-1 md:grid-cols-3";

  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="mb-12">
        <PlaceholderSlot name="headline" value={slots.headline}>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">
            {slots.headline as string}
          </h2>
        </PlaceholderSlot>
        {slots.subhead !== undefined && (
          <div className="mt-4">
            <PlaceholderSlot name="subhead" value={slots.subhead}>
              <p className="text-lg text-gray-600">{slots.subhead as string}</p>
            </PlaceholderSlot>
          </div>
        )}
      </div>

      <div className={`grid gap-8 ${gridClass}`}>
        {features.map((f, i) => (
          <FeatureCard
            key={i}
            icon={f.icon}
            title={f.title}
            description={f.description}
          />
        ))}
      </div>
    </section>
  );
}
