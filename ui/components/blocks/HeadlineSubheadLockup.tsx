/**
 * HeadlineSubheadLockup — eyebrow + headline + subhead with alignment control.
 */

interface HeadlineSubheadLockupProps {
  eyebrow?: string | null;
  headline: string;
  subhead?: string | null;
  align?: "left" | "center" | "right";
}

const alignClasses: Record<string, string> = {
  left: "text-left",
  center: "text-center mx-auto",
  right: "text-right ml-auto",
};

export function HeadlineSubheadLockup({
  eyebrow,
  headline,
  subhead,
  align = "left",
}: HeadlineSubheadLockupProps) {
  return (
    <div className={`max-w-2xl ${alignClasses[align]}`}>
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
          {eyebrow}
        </p>
      )}
      <h2 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight tracking-tight">
        {headline}
      </h2>
      {subhead && (
        <p className="mt-4 text-lg text-gray-600 leading-relaxed">{subhead}</p>
      )}
    </div>
  );
}
