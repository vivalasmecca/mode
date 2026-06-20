import * as fs from "fs";
import * as path from "path";
import { DATA_ROOT, getLatestOutput, getOutputByFile } from "@/lib/get-output";
import type { VariantOverrideMap } from "@/lib/types";
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

export default async function PreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ file?: string }>;
}) {
  const { file } = await searchParams;
  const output = file ? getOutputByFile(file) : getLatestOutput();

  if (!output) return <EmptyState />;

  let variantOverrides: VariantOverrideMap = {};
  try {
    const overridesPath = path.join(DATA_ROOT, "tokens", "variant-overrides.json");
    if (fs.existsSync(overridesPath)) {
      variantOverrides = JSON.parse(fs.readFileSync(overridesPath, "utf8")) as VariantOverrideMap;
    }
  } catch {
    variantOverrides = {};
  }

  return <PreviewClient output={output} variantOverrides={variantOverrides} />;
}
