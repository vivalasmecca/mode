import * as fs from "fs";
import * as path from "path";
import type { PageOutput, SiteManifest } from "./types";

export interface PageRegistryEntry {
  label: string;
  route: string;
  /** When set, this page serves only the variant from the active build whose label matches this value. */
  variant_label?: string;
}

/**
 * Root directory containing the mode data directories (output/, config/, tokens/, …).
 *
 * - Locally: the parent of ui/ (i.e. mode/), because process.cwd() = ui/.
 * - On Vercel: vercel.json buildCommand pre-copies those directories into
 *   ui/mode-data/ before the build, so we read from there at runtime.
 */
export const DATA_ROOT = process.env.VERCEL
  ? path.join(process.cwd(), "mode-data")
  : path.resolve(process.cwd(), "..");

/**
 * Reads a specific JSON output file by filename.
 * Used by /preview?file= to address a named variant file.
 */
export function getOutputByFile(filename: string): PageOutput | null {
  try {
    const outputDir = path.join(DATA_ROOT, "output");
    // path.basename prevents directory traversal
    const filepath = path.join(outputDir, path.basename(filename));
    if (!fs.existsSync(filepath)) return null;
    return JSON.parse(fs.readFileSync(filepath, "utf8")) as PageOutput;
  } catch {
    return null;
  }
}

/**
 * Reads a site manifest by its timestamp slug (e.g. "2026-06-14T12-34-56-789Z").
 * Written by /api/generate/page after a multi-variant build completes.
 */
export function getSiteManifest(ts: string): SiteManifest | null {
  try {
    const outputDir = path.join(DATA_ROOT, "output");
    const filepath = path.join(outputDir, `site-${path.basename(ts)}.json`);
    if (!fs.existsSync(filepath)) return null;
    return JSON.parse(fs.readFileSync(filepath, "utf8")) as SiteManifest;
  } catch {
    return null;
  }
}

/**
 * Reads config/pages.json — the page registry mapping named pages to routes and variant sources.
 * Returns an empty array if the file does not exist.
 */
export function getPageRegistry(): PageRegistryEntry[] {
  try {
    const filepath = path.join(DATA_ROOT, "config", "pages.json");
    if (!fs.existsSync(filepath)) return [];
    return JSON.parse(fs.readFileSync(filepath, "utf8")) as PageRegistryEntry[];
  } catch {
    return [];
  }
}

/**
 * Finds the most recent output file for a given variant label.
 *
 * Search order:
 * 1. The supplied active build (if any)
 * 2. All site manifests in the output directory, newest first
 * 3. Direct scan of output/*.json files matching *-{variantLabel}.json
 *
 * This lets the pricing page (label "conversion") survive when the active
 * build is archetype-driven and has no conversion variant.
 */
export function findVariantFile(
  variantLabel: string,
  activeBuildTs?: string | null
): { filename: string; output: PageOutput } | null {
  // 1. Active build
  if (activeBuildTs) {
    const manifest = getSiteManifest(activeBuildTs);
    if (manifest) {
      const page = manifest.pages.find((p) => p.label === variantLabel);
      if (page) {
        const output = getOutputByFile(page.filename);
        if (output) return { filename: page.filename, output };
      }
    }
  }

  // 2. All site manifests, newest first
  try {
    const outputDir = path.join(DATA_ROOT, "output");
    if (fs.existsSync(outputDir)) {
      const manifests = fs
        .readdirSync(outputDir)
        .filter((f) => f.startsWith("site-") && f.endsWith(".json"))
        .map((f) => ({
          name: f,
          mtime: fs.statSync(path.join(outputDir, f)).mtime.getTime(),
        }))
        .sort((a, b) => b.mtime - a.mtime);

      for (const m of manifests) {
        try {
          const manifest = JSON.parse(
            fs.readFileSync(path.join(outputDir, m.name), "utf8")
          ) as SiteManifest;
          const page = manifest.pages.find((p) => p.label === variantLabel);
          if (page) {
            const output = getOutputByFile(page.filename);
            if (output) return { filename: page.filename, output };
          }
        } catch {
          // skip malformed manifests
        }
      }
    }
  } catch {
    // fall through
  }

  // 3. Direct output file scan (e.g. page-{ts}-conversion.json)
  try {
    const outputDir = path.join(DATA_ROOT, "output");
    if (fs.existsSync(outputDir)) {
      const suffix = `-${variantLabel}.json`;
      const files = fs
        .readdirSync(outputDir)
        .filter((f) => f.startsWith("page-") && f.endsWith(suffix))
        .map((f) => ({
          name: f,
          mtime: fs.statSync(path.join(outputDir, f)).mtime.getTime(),
        }))
        .sort((a, b) => b.mtime - a.mtime);
      if (files.length > 0) {
        const output = getOutputByFile(files[0].name);
        if (output) return { filename: files[0].name, output };
      }
    }
  } catch {
    // fall through
  }

  return null;
}

/**
 * Reads the most recent JSON output file from output/.
 * Used directly by server components (no HTTP, no port dependency).
 */
export function getLatestOutput(): PageOutput | null {
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

    if (files.length === 0) return null;

    const latest = path.join(outputDir, files[0].name);
    return JSON.parse(fs.readFileSync(latest, "utf8")) as PageOutput;
  } catch {
    return null;
  }
}
