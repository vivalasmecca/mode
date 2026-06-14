import * as fs from "fs";
import * as path from "path";
import type { PageOutput } from "./types";

/**
 * Reads a specific JSON output file by filename.
 * Used by /preview?file= to address a named variant file.
 */
export function getOutputByFile(filename: string): PageOutput | null {
  try {
    const outputDir = path.resolve(process.cwd(), "../output");
    // path.basename prevents directory traversal
    const filepath = path.join(outputDir, path.basename(filename));
    if (!fs.existsSync(filepath)) return null;
    return JSON.parse(fs.readFileSync(filepath, "utf8")) as PageOutput;
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
    const outputDir = path.resolve(process.cwd(), "../output");

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
