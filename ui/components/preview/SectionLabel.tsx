/**
 * SectionLabel — dev-only classification bar rendered above each section.
 * Shows the MODE metadata behind a section: what it is, why it's here,
 * which archetype it's serving, and which funnel stage it belongs to.
 *
 * Only visible when the label toggle is on. Never ships to production.
 */

const ARCHETYPE_STYLES: Record<string, { border: string; tag: string }> = {
  Validator: { border: "border-l-indigo-400", tag: "bg-indigo-50 text-indigo-700" },
  Mover:     { border: "border-l-amber-400",  tag: "bg-amber-50 text-amber-700"  },
  Explorer:  { border: "border-l-violet-400", tag: "bg-violet-50 text-violet-700" },
};

interface SectionLabelProps {
  sectionName: string;
  /** Narrative beat this section belongs to */
  beat?: string;
  component: string;
  variant: string | null;
  /** Component selector reasoning — why this module for this slot */
  reasoning: string | null;
  /** IA rationale — why this section exists in the page flow */
  rationale: string | null;
  archetype: string;
  funnel_stage: string;
}

export function SectionLabel({
  sectionName,
  beat,
  component,
  variant,
  reasoning,
  rationale,
  archetype,
  funnel_stage,
}: SectionLabelProps) {
  const styles = ARCHETYPE_STYLES[archetype] ?? {
    border: "border-l-gray-400",
    tag: "bg-gray-100 text-gray-600",
  };

  // IA rationale = strategic (why section exists); reasoning = tactical (why this module).
  // Show strategic first, tactical on hover.
  const primaryText = rationale ?? reasoning;
  const hoverText   = rationale && reasoning ? reasoning : null;

  return (
    <div className={`border-l-2 ${styles.border} bg-gray-950 px-4 py-2.5`}>
      {/* Row 1: identifiers */}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {beat && (
          <span className="rounded bg-gray-700 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-200">
            {beat}
          </span>
        )}
        <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
          {sectionName}
        </span>
        <span className="font-mono text-xs text-gray-300">
          {component}{variant ? ` · ${variant}` : ""}
        </span>
        <div className="ml-auto flex shrink-0 gap-1.5">
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${styles.tag}`}>
            {archetype}
          </span>
          <span className="rounded bg-gray-800 px-1.5 py-0.5 font-mono text-[10px] text-gray-400">
            {funnel_stage}
          </span>
        </div>
      </div>

      {/* Row 2: rationale / reasoning */}
      {primaryText && (
        <p
          className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-gray-500"
          title={hoverText ?? primaryText}
        >
          {primaryText}
        </p>
      )}
    </div>
  );
}
