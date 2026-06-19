import * as fs from "fs";
import * as path from "path";
import {
  getLatestOutput,
  getOutputByFile,
  getSiteManifest,
  DATA_ROOT,
} from "@/lib/get-output";
import type { SiteManifest } from "@/lib/types";
import { EditClient } from "./EditClient";

export interface VariantData {
  label: string;
  filename: string;
  output: NonNullable<ReturnType<typeof getOutputByFile>>;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getLatestFilename(): string | null {
  try {
    const outputDir = path.join(DATA_ROOT, "output");
    if (!fs.existsSync(outputDir)) return null;
    const files = fs
      .readdirSync(outputDir)
      .filter((f) => f.endsWith(".json") && f.startsWith("page-"))
      .map((f) => ({
        name: f,
        mtime: fs.statSync(path.join(outputDir, f)).mtime.getTime(),
      }))
      .sort((a, b) => b.mtime - a.mtime);
    return files.length > 0 ? files[0].name : null;
  } catch {
    return null;
  }
}

function getLatestSiteManifest(): SiteManifest | null {
  try {
    const outputDir = path.join(DATA_ROOT, "output");
    if (!fs.existsSync(outputDir)) return null;
    const files = fs
      .readdirSync(outputDir)
      .filter((f) => f.startsWith("site-") && f.endsWith(".json"))
      .map((f) => ({
        name: f,
        mtime: fs.statSync(path.join(outputDir, f)).mtime.getTime(),
      }))
      .sort((a, b) => b.mtime - a.mtime);
    if (files.length === 0) return null;
    const filepath = path.join(outputDir, files[0].name);
    return JSON.parse(fs.readFileSync(filepath, "utf8")) as SiteManifest;
  } catch {
    return null;
  }
}

function variantsFromManifest(manifest: SiteManifest): VariantData[] {
  return manifest.pages
    .map((p) => {
      const output = getOutputByFile(p.filename);
      if (!output) return null;
      return { label: p.label, filename: p.filename, output };
    })
    .filter((v): v is VariantData => v !== null);
}

// ─── Empty / error states ────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center px-6">
      <div className="text-4xl">◻</div>
      <h1 className="text-xl font-semibold text-gray-900">No output yet</h1>
      <p className="max-w-sm text-sm text-gray-500">
        Run the agent to generate a page, then return to this tab.
      </p>
      <pre className="mt-2 rounded-lg bg-gray-100 px-4 py-3 text-xs text-gray-600 text-left">
        node agent/page-builder.js
      </pre>
    </div>
  );
}

function NotFound({ message }: { message: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center px-6">
      <div className="text-4xl">◻</div>
      <h1 className="text-xl font-semibold text-gray-900">Not found</h1>
      <p className="max-w-sm text-sm text-gray-500">{message}</p>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";

export default async function EditPage({
  searchParams,
}: {
  searchParams: Promise<{ ts?: string; file?: string }>;
}) {
  const { ts, file } = await searchParams;

  // ?ts= → load a specific build's full set of variants via site manifest
  if (ts) {
    const manifest = getSiteManifest(ts);
    if (!manifest) {
      return (
        <NotFound
          message={`No site manifest found for build ${ts}. The output file may have been deleted.`}
        />
      );
    }
    const variants = variantsFromManifest(manifest);
    if (variants.length === 0) return <EmptyState />;
    return <EditClient variants={variants} preset={manifest.preset} />;
  }

  // ?file= → single-file edit (backward-compatible)
  if (file) {
    const output = getOutputByFile(file);
    if (!output) {
      return <NotFound message={`File "${file}" not found.`} />;
    }
    return (
      <EditClient
        variants={[{ label: file, filename: file, output }]}
      />
    );
  }

  // No params → prefer the latest site manifest (loads all variants).
  // Fall back to the latest single page file.
  const manifest = getLatestSiteManifest();
  if (manifest) {
    const variants = variantsFromManifest(manifest);
    if (variants.length > 0) {
      return <EditClient variants={variants} preset={manifest.preset} />;
    }
  }

  const output = getLatestOutput();
  if (!output) return <EmptyState />;
  const filename = getLatestFilename() ?? "";
  return (
    <EditClient variants={[{ label: filename, filename, output }]} />
  );
}
