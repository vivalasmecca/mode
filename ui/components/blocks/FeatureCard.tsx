/**
 * FeatureCard — icon + title + description unit.
 * Accepts palette classes from parent for color-aware rendering.
 */

import type { PaletteClasses } from "@/lib/palette";

interface FeatureCardProps {
  icon?: string;
  title: string;
  description: string;
  palette?: PaletteClasses;
}

export function FeatureCard({ icon, title, description, palette }: FeatureCardProps) {
  const iconBg = palette?.iconBg ?? "bg-gray-100";
  const titleColor = palette?.text ?? "text-gray-900";
  const descColor = palette?.subtext ?? "text-gray-600";

  return (
    <div className="flex flex-col gap-3">
      {icon && (
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg} text-xl`}>
          {icon}
        </div>
      )}
      <h3 className={`font-semibold ${titleColor}`}>{title}</h3>
      <p className={`text-sm leading-relaxed ${descColor}`}>{description}</p>
    </div>
  );
}
