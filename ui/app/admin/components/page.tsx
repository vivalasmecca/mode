import * as fs from "fs";
import * as path from "path";
import { DATA_ROOT } from "@/lib/get-output";

interface ComponentDef {
  name: string;
  purpose: string;
  tier: string;
  beats: string[];
  archetypes: string[];
  funnel_stages: string[];
  variants: string[];
  notes: string;
}

interface Manifest {
  version: string;
  components: ComponentDef[];
}

// Ordered beat sequence with plain-language descriptions for site planners
const BEAT_META: Record<string, { label: string; description: string; color: string }> = {
  Orientation: {
    label: "Orientation",
    description: "Entry point. Establishes context, brand voice, and the core proposition before anything else is asked of the visitor.",
    color: "bg-violet-50 border-violet-200 text-violet-800",
  },
  Credibility: {
    label: "Credibility",
    description: "Earns the right to be heard. Social proof, authority signals, and trust markers before the product argument is made.",
    color: "bg-blue-50 border-blue-200 text-blue-800",
  },
  Value: {
    label: "Value",
    description: "Makes the case. Features, benefits, and the product argument — what it does and why it matters.",
    color: "bg-emerald-50 border-emerald-200 text-emerald-800",
  },
  Evidence: {
    label: "Evidence",
    description: "Substantiates the claims. Specific data, testimonials, and proof points that turn assertions into facts.",
    color: "bg-amber-50 border-amber-200 text-amber-800",
  },
  Decision: {
    label: "Decision",
    description: "Frames the choice. Pricing tiers, feature comparison, and the structure that helps a visitor commit.",
    color: "bg-orange-50 border-orange-200 text-orange-800",
  },
  Conversion: {
    label: "Conversion",
    description: "The ask. Clear action, removed friction, maximum signal-to-noise. Nothing competes with the CTA.",
    color: "bg-red-50 border-red-200 text-red-800",
  },
  Recovery: {
    label: "Recovery",
    description: "The exit. Brand warmth, secondary paths, and reassurance for visitors who aren't ready to act.",
    color: "bg-gray-50 border-gray-200 text-gray-600",
  },
};

const BEAT_ORDER = ["Orientation", "Credibility", "Value", "Evidence", "Decision", "Conversion", "Recovery"];

const ARCHETYPE_COLORS: Record<string, string> = {
  Mover: "bg-rose-50 text-rose-700",
  Validator: "bg-blue-50 text-blue-700",
  Explorer: "bg-teal-50 text-teal-700",
};

const STAGE_COLORS: Record<string, string> = {
  awareness: "bg-violet-50 text-violet-700",
  consideration: "bg-blue-50 text-blue-700",
  decision: "bg-orange-50 text-orange-700",
  conversion: "bg-red-50 text-red-700",
};

function Chip({ label, colorClass }: { label: string; colorClass: string }) {
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${colorClass}`}>
      {label}
    </span>
  );
}

function VariantPill({ label }: { label: string }) {
  return (
    <span className="inline-block rounded border border-gray-200 bg-white px-2 py-0.5 font-mono text-[10px] text-gray-600">
      {label}
    </span>
  );
}

function ComponentCard({ component }: { component: ComponentDef }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">{component.name}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{component.purpose}</p>
        </div>
      </div>

      {/* Variants */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {component.variants.map((v) => (
          <VariantPill key={v} label={v} />
        ))}
      </div>

      {/* Archetypes + funnel stages */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {component.archetypes.map((a) => (
          <Chip key={a} label={a} colorClass={ARCHETYPE_COLORS[a] ?? "bg-gray-100 text-gray-600"} />
        ))}
        {component.funnel_stages.map((s) => (
          <Chip key={s} label={s} colorClass={STAGE_COLORS[s] ?? "bg-gray-100 text-gray-600"} />
        ))}
      </div>

      {/* Notes */}
      {component.notes && (
        <p className="mt-3 text-[11px] leading-relaxed text-gray-400 border-t border-gray-100 pt-3">
          {component.notes}
        </p>
      )}
    </div>
  );
}

export default function ComponentsPage() {
  let manifest: Manifest | null = null;
  try {
    const manifestPath = path.join(DATA_ROOT, "manifest/components.json");
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as Manifest;
  } catch {
    // fall through to empty state
  }

  if (!manifest) {
    return (
      <div className="flex items-center justify-center py-32">
        <p className="text-sm text-gray-400">Could not load component manifest.</p>
      </div>
    );
  }

  // Group by beat — a component appears once per beat it belongs to
  const byBeat: Record<string, ComponentDef[]> = {};
  for (const beat of BEAT_ORDER) {
    byBeat[beat] = manifest.components.filter((c) => c.beats.includes(beat));
  }

  return (
    <main>
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-10">
        <div className="flex items-baseline justify-between">
          <div>
            <h1 className="text-base font-semibold text-gray-900">Component Library</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              {manifest.components.length} components · manifest v{manifest.version}
            </p>
          </div>
          <p className="text-xs text-gray-400">Grouped by narrative role</p>
        </div>

        {BEAT_ORDER.map((beat) => {
          const components = byBeat[beat] ?? [];
          const meta = BEAT_META[beat];
          if (!meta) return null;

          return (
            <section key={beat}>
              {/* Beat header */}
              <div className={`mb-4 rounded-lg border px-4 py-3 ${meta.color}`}>
                <p className={`text-xs font-semibold uppercase tracking-widest ${meta.color.split(" ").pop()}`}>
                  {meta.label}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed opacity-80">{meta.description}</p>
              </div>

              {components.length === 0 ? (
                <p className="text-xs text-gray-400 pl-1">No components mapped to this beat.</p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {components.map((c) => (
                    <ComponentCard key={`${beat}-${c.name}`} component={c} />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}
