import type { PageOutput, PageSection } from "@/lib/types";
import { getLatestOutput } from "@/lib/get-output";
import { MODULE_REGISTRY } from "@/components/modules";

function UnknownComponent({ name }: { name: string }) {
  return (
    <div className="mx-auto my-4 max-w-6xl px-6">
      <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Unknown component: <code className="font-mono font-semibold">{name}</code> — not in registry
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center px-6">
      <div className="text-4xl">◻</div>
      <h1 className="text-xl font-semibold text-gray-900">No output yet</h1>
      <p className="max-w-sm text-sm text-gray-500">
        Run the agent to generate a page, then refresh this tab.
      </p>
      <pre className="mt-2 rounded-lg bg-gray-100 px-4 py-3 text-xs text-gray-600 text-left">
        node agent/page-builder.js
      </pre>
    </div>
  );
}

function DebugBar({ output }: { output: PageOutput }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 rounded-lg border border-gray-200 bg-white/90 px-4 py-2.5 text-xs text-gray-500 shadow-sm backdrop-blur-sm font-mono">
      <span className="font-semibold text-gray-700">{output.brief.archetype}</span>
      {" · "}
      <span>{output.brief.funnel_stage}</span>
      {" · "}
      <span>{new Date(output.generated_at).toLocaleDateString()}</span>
    </div>
  );
}

export const dynamic = "force-dynamic";

export default function PreviewPage() {
  const output: PageOutput | null = getLatestOutput();

  if (!output) {
    return <EmptyState />;
  }

  return (
    <main className="min-h-screen bg-white">
      {output.page.map((section: PageSection, i: number) => {
        const Component = MODULE_REGISTRY[section.component];

        if (!Component) {
          return <UnknownComponent key={i} name={section.component} />;
        }

        return (
          <Component key={i} slots={section.slots} variant={section.variant} />
        );
      })}

      <DebugBar output={output} />
    </main>
  );
}
