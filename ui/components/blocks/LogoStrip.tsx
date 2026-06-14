/**
 * LogoStrip — horizontal brand logo array.
 * Renders animated pulse placeholders when logos array is empty.
 * Grayscale by default.
 */

interface Logo {
  src?: string;
  alt?: string;
}

interface LogoStripProps {
  logos?: (Logo | string)[] | null;
}

export function LogoStrip({ logos }: LogoStripProps) {
  if (!logos || logos.length === 0) {
    return (
      <div className="flex items-center gap-8 flex-wrap">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-6 w-20 rounded bg-gray-200 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-8 flex-wrap">
      {logos.map((logo, i) => {
        const src = typeof logo === "string" ? logo : logo?.src;
        const alt = typeof logo === "object" ? logo?.alt : undefined;

        if (!src) {
          return <div key={i} className="h-6 w-20 rounded bg-gray-200 animate-pulse" />;
        }

        return (
          <img
            key={i}
            src={src}
            alt={alt ?? `Logo ${i + 1}`}
            className="h-6 w-auto grayscale opacity-50 object-contain"
          />
        );
      })}
    </div>
  );
}
