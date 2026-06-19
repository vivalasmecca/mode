import { getLatestOutput } from "@/lib/get-output";
import type { BehavioralTokens } from "@/lib/types";


function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500 shrink-0">{label}</span>
      <span className="text-sm text-gray-900 text-right">{value}</span>
    </div>
  );
}

function BehavioralBadge({ value }: { value: boolean | string }) {
  if (typeof value === "boolean") {
    return (
      <span
        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
          value ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"
        }`}
      >
        {value ? "yes" : "no"}
      </span>
    );
  }
  const densityColors: Record<string, string> = {
    low: "bg-blue-50 text-blue-700",
    medium: "bg-amber-50 text-amber-700",
    high: "bg-red-50 text-red-700",
    always: "bg-purple-50 text-purple-700",
    optional: "bg-gray-100 text-gray-600",
    never: "bg-gray-50 text-gray-400",
  };
  const color = densityColors[value] ?? "bg-gray-100 text-gray-600";
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {value}
    </span>
  );
}

export default function DashboardPage() {
  const output = getLatestOutput();

  if (!output) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <p className="text-gray-500 text-sm">No output found.</p>
          <p className="text-gray-400 text-xs mt-1">Run <code className="font-mono">node agent/page-builder.js</code> to generate a page.</p>
        </div>
      </div>
    );
  }

  const { brief, preset, preset_description, palette_driver, behavioral_tokens, ia } = output;
  const bt = behavioral_tokens as BehavioralTokens | undefined;

  return (
    <main>
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* Row 1: Deployment + Brief side by side */}
        <div className="grid grid-cols-2 gap-6">

          {/* Deployment panel */}
          <Section title="Deployment">
            <Row label="Active preset" value={<span className="font-mono text-indigo-700">{preset ?? "—"}</span>} />
            <Row label="Palette driver" value={<span className="font-mono text-gray-700">{palette_driver ?? "—"}</span>} />
            {preset_description && (
              <p className="mt-3 text-xs text-gray-500 leading-relaxed">{preset_description}</p>
            )}
          </Section>

          {/* Brief panel */}
          <Section title="Brief">
            <Row label="Audience" value={brief.audience} />
            <Row label="Archetype" value={<span className="font-medium">{brief.archetype}</span>} />
            <Row label="Funnel stage" value={brief.funnel_stage} />
            <Row label="Goal" value={brief.goal} />
            <Row label="Context mode" value={brief.context_mode} />
          </Section>
        </div>

        {/* Design token CTA */}
        <Section title="Design Tokens">
          <div className="flex items-start justify-between gap-6">
            <div className="space-y-1.5 max-w-lg">
              <p className="text-sm text-gray-700">
                Map your brand's color vocabulary to MODE's semantic palette — no code required.
              </p>
              <p className="text-xs text-gray-500 leading-relaxed">
                In <span className="font-medium text-gray-700">Studio → Design System</span>, edit your full color scale (every hue and step). In <span className="font-medium text-gray-700">Studio → Canvas</span>, open the token panel to remap which scale values serve each semantic role — background, text, border, accent — across light, neutral, and dark modes. Changes take effect on the next page request with no rebuild.
              </p>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <a
                href="/admin/studio"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-gray-900 text-white text-xs font-medium hover:bg-gray-700 transition-colors"
              >
                Open Studio →
              </a>
            </div>
          </div>
        </Section>

        {/* Behavioral tokens */}
        {bt && (
          <Section title={`Behavioral Tokens — ${brief.archetype}`}>
            <div className="grid grid-cols-3 gap-x-6 gap-y-1">
              <Row label="copy_density" value={<BehavioralBadge value={bt.copy_density} />} />
              <Row label="evidence_density" value={<BehavioralBadge value={bt.evidence_density} />} />
              <Row label="subhead_policy" value={<BehavioralBadge value={bt.subhead_policy} />} />
              <Row label="require_trust_signal" value={<BehavioralBadge value={bt.require_trust_signal} />} />
              <Row label="allow_secondary_cta" value={<BehavioralBadge value={bt.allow_secondary_cta} />} />
            </div>
          </Section>
        )}

        {/* IA rationale */}
        <Section title="Information Architecture">
          {/* Beat sequence */}
          {ia.beats && ia.beats.length > 0 && (
            <div className="mb-4 pb-4 border-b border-gray-100">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
                Beat sequence
              </p>
              <div className="flex flex-wrap gap-1.5">
                {ia.beats.map((b, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && <span className="text-gray-300 text-xs">→</span>}
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                      {b.name}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}
          {/* Sections */}
          <div className="space-y-3">
            {ia.sections.map((s, i) => (
              <div key={i} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-gray-400 tabular-nums w-4">{i + 1}.</span>
                  {s.beat && (
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">
                      {s.beat}
                    </span>
                  )}
                  <span className="text-sm font-medium text-gray-900">{s.name}</span>
                  {s.candidate_components.length > 0 && (
                    <span className="text-xs text-gray-400 font-mono">
                      [{s.candidate_components.join(", ")}]
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1 ml-6 leading-relaxed">{s.rationale}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Preview link */}
        <div className="flex justify-end">
          <a
            href="/admin/preview"
            className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800"
          >
            View preview →
          </a>
        </div>
      </div>
    </main>
  );
}
