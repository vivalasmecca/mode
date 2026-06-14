import { getLatestOutput } from "@/lib/get-output";
import type { BehavioralTokens } from "@/lib/types";

const PALETTE_COLORS: Record<string, { dot: string; label: string }> = {
  light: { dot: "bg-white border border-gray-300", label: "light" },
  neutral: { dot: "bg-gray-200", label: "neutral" },
  dark: { dot: "bg-gray-900", label: "dark" },
};

function PaletteDot({ mode }: { mode?: string }) {
  const cfg = PALETTE_COLORS[mode ?? "light"];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block w-3 h-3 rounded-full ${cfg.dot}`} />
      <span className="text-gray-700">{cfg.label}</span>
    </span>
  );
}

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
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-sm">No output found.</p>
          <p className="text-gray-400 text-xs mt-1">Run <code className="font-mono">node agent/page-builder.js</code> to generate a page.</p>
        </div>
      </main>
    );
  }

  const { brief, preset, preset_description, palette_driver, behavioral_tokens, page, ia, generated_at, schema_version } = output;
  const bt = behavioral_tokens as BehavioralTokens | undefined;

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-baseline justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">MODE</span>
            <h1 className="text-lg font-semibold text-gray-900 mt-0.5">Token Dashboard</h1>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">schema {schema_version}</p>
            <p className="text-xs text-gray-400">{new Date(generated_at).toLocaleString()}</p>
          </div>
        </div>
      </div>

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

        {/* Token resolution table */}
        <Section title="Token Resolution">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                <th className="pb-2 pr-4 font-medium">Section</th>
                <th className="pb-2 pr-4 font-medium">Component</th>
                <th className="pb-2 pr-4 font-medium">Variant</th>
                <th className="pb-2 font-medium">Palette</th>
              </tr>
            </thead>
            <tbody>
              {page.map((s, i) => (
                <tr key={i} className="border-b border-gray-50 last:border-0">
                  <td className="py-2 pr-4 text-gray-700">{s.section}</td>
                  <td className="py-2 pr-4 font-mono text-xs text-gray-600">{s.component}</td>
                  <td className="py-2 pr-4 font-mono text-xs text-gray-500">{s.variant ?? "—"}</td>
                  <td className="py-2">
                    <PaletteDot mode={s.palette} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        {/* IA rationale */}
        <Section title="Information Architecture">
          <div className="space-y-3">
            {ia.sections.map((s, i) => (
              <div key={i} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-gray-400 tabular-nums w-4">{i + 1}.</span>
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
            href="/preview"
            className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800"
          >
            View preview →
          </a>
        </div>
      </div>
    </main>
  );
}
