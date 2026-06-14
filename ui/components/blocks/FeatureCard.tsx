/**
 * FeatureCard — icon + title + description unit.
 */

interface FeatureCardProps {
  icon?: string;
  title: string;
  description: string;
}

export function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="flex flex-col gap-3">
      {icon && (
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-xl">
          {icon}
        </div>
      )}
      <h3 className="font-semibold text-gray-900">{title}</h3>
      <p className="text-sm leading-relaxed text-gray-600">{description}</p>
    </div>
  );
}
