import { getLatestOutput } from "@/lib/get-output";
import { PreviewClient } from "@/components/preview/PreviewClient";

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

export const dynamic = "force-dynamic";

export default function PreviewPage() {
  const output = getLatestOutput();

  if (!output) return <EmptyState />;

  return <PreviewClient output={output} />;
}
