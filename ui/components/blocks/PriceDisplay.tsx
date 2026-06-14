/**
 * PriceDisplay — price + billing period + optional badge.
 */

interface PriceDisplayProps {
  price: string;
  billingPeriod: string;
  badge?: string | null;
}

export function PriceDisplay({ price, billingPeriod, badge }: PriceDisplayProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex items-baseline gap-1">
        <span className="text-4xl font-bold tracking-tight text-gray-900">{price}</span>
        <span className="text-sm text-gray-500">/{billingPeriod}</span>
      </div>
      {badge && (
        <span className="mt-1 rounded-full bg-gray-900 px-2.5 py-0.5 text-xs font-semibold text-white">
          {badge}
        </span>
      )}
    </div>
  );
}
