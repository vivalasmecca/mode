import { createRequire } from "module";
import * as fs from "fs";
import * as path from "path";
import { DATA_ROOT } from "@/lib/get-output";

// Same anchor pattern as the other generate routes.
const _require = createRequire(path.resolve(process.cwd(), "__route__"));

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * POST /api/generate/content
 *
 * Content-only regeneration. Accepts an array of existing output filenames,
 * loads each file, re-runs populateContent() with the preserved IA + component
 * selection + behavioral tokens, and writes new timestamped output files.
 *
 * Skips ia-planner, component-selector, and token-resolver — nothing structural
 * changes. Only the LLM-generated slot values are replaced.
 *
 * Input:  { filenames: string[] }
 * Output: { success, ts, siteUrl, variants: [{ label, filename, previewUrl, siteUrl }] }
 */
export async function POST(req: Request) {
  try {
    const { filenames, content_notes }: { filenames: string[]; content_notes?: string } = await req.json();

    if (!Array.isArray(filenames) || filenames.length === 0) {
      return Response.json({ error: "filenames array is required" }, { status: 400 });
    }

    const outputDir = path.join(DATA_ROOT, "output");
    const manifestPath = path.join(DATA_ROOT, "manifest/components.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

    const { populateContent } = _require("mode-agent/content-generator");

    const timestamp = new Date().toISOString();
    const ts = timestamp.replace(/[:.]/g, "-");

    const results = await Promise.all(
      filenames.map(async (filename) => {
        const existing = JSON.parse(
          fs.readFileSync(path.join(outputDir, path.basename(filename)), "utf8")
        );

        // Re-run only content generation. The IA, component structure, palette,
        // and behavioral tokens are all preserved from the source file.
        // content_notes override (if provided) replaces whatever was in the
        // original brief so the author can iterate without a full rebuild.
        const brief =
          content_notes !== undefined
            ? { ...existing.brief, content_notes }
            : existing.brief;

        const populatedPage = await populateContent(
          existing.ia,
          existing.page,
          brief,
          manifest,
          existing.behavioral_tokens ?? null
        );

        const safeLabel = existing.variant.toLowerCase().replace(/\s+/g, "-");
        const newFilename = `page-${ts}-${safeLabel}.json`;
        const previewUrl = `/admin/preview?file=${newFilename}`;
        const siteUrl = `/admin/site?ts=${ts}&page=${safeLabel}`;

        const output = {
          ...existing,
          generated_at: timestamp,
          brief,
          page: populatedPage,
          preview_url: previewUrl,
          _regen_from: path.basename(filename),
        };

        fs.writeFileSync(
          path.join(outputDir, newFilename),
          JSON.stringify(output, null, 2)
        );

        return {
          label: existing.variant as string,
          safeLabel,
          filename: newFilename,
          previewUrl,
          siteUrl,
          preset: existing.preset as string,
          paletteDriver: existing.palette_driver as string,
          brief: existing.brief as Record<string, string>,
        };
      })
    );

    // Write a new site manifest so /site?ts= works for the regen output.
    const siteManifest = {
      schema_version: "1.0.0",
      built_at: timestamp,
      ts,
      preset: results[0].preset,
      palette_driver: results[0].paletteDriver,
      brief: results[0].brief,
      pages: results.map((r) => ({
        label: r.safeLabel,
        filename: r.filename,
        previewUrl: r.previewUrl,
        siteUrl: r.siteUrl,
      })),
    };
    fs.writeFileSync(
      path.join(outputDir, `site-${ts}.json`),
      JSON.stringify(siteManifest, null, 2)
    );

    return Response.json({
      success: true,
      ts,
      siteUrl: `/admin/site?ts=${ts}`,
      variants: results.map(({ label, filename, previewUrl, siteUrl }) => ({
        label,
        filename,
        previewUrl,
        siteUrl,
      })),
    });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
