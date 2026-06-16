import * as fs from "fs";
import * as path from "path";
import type { PageOutput, SiteManifest } from "./types";

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
 * Reads the most recent JSON output file from output/.
 * Used directly by server components (no HTTP, no port dependency).
 */
export function getLatestOutput(): PageOutput | null {
  try {
    const outputDir = path.join(DATA_ROOT, "output");

    if (!fs.existsSync(outputDir)) return null;

    const files = fs
      .readdirSync(outputDir)
      .filter((f) => f.endsWith(".json"))
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
