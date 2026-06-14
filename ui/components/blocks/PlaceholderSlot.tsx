/**
 * PlaceholderSlot — renders a dashed border indicator for null or unfilled slots.
 *
 * Shows the placeholder when value is:
 *   - null or undefined
 *   - a string matching /^\[.+\]$/ (e.g. "[headline]", "[cta_primary]")
 *
 * Otherwise renders children. This is the primary null-guard for all module components.
 */

interface PlaceholderSlotProps {
  name: string;
  value: unknown;
  inline?: boolean;
  children?: React.ReactNode;
}

export function isPlaceholderValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" && /^\[.+\]$/.test(value)) return true;
  return false;
}

export function PlaceholderSlot({ name, value, inline = false, children }: PlaceholderSlotProps) {
  if (isPlaceholderValue(value)) {
    if (inline) {
      return (
        <span className="inline-flex items-center border border-dashed border-gray-300 bg-gray-50 text-gray-400 text-xs px-2 py-0.5 rounded font-mono">
          [{name}]
        </span>
      );
    }
    return (
      <div className="border border-dashed border-gray-300 bg-gray-50 text-gray-400 text-xs px-3 py-2 rounded font-mono">
        [{name}]
      </div>
    );
  }

  return <>{children}</>;
}
