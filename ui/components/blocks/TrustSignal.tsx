/**
 * TrustSignal — optional friction-reducing string near a CTA.
 * Returns null when value is null — no placeholder needed (it's an optional slot).
 */

interface TrustSignalProps {
  value: string | null | undefined;
}

export function TrustSignal({ value }: TrustSignalProps) {
  if (!value) return null;
  return (
    <p className="text-sm text-gray-500 flex items-center gap-1.5">
      <svg
        className="w-3.5 h-3.5 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      {value}
    </p>
  );
}
