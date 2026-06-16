import { createRequire } from "module";
import * as fs from "fs";
import * as path from "path";

const _require = createRequire(path.resolve(process.cwd(), "__route__"));

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * POST /api/generate/palette
 *
 * Palette-only re-application. Accepts existing output filenames and a new
 * preset key. Re-runs resolveTokens() with the new preset, remaps
 * section.palette for every section, and writes new output files.
 *
 * All slot content (copy, CTAs, stats, etc.) is preserved exactly.
 * Only palette mode per section, preset metadata, behavioral tokens,
 * and accent tokens are updated.
 *
 * Input:  { filenames: string[], preset: string }
 * Output: { success, ts, siteUrl, variants: [{ label, filename, previewUrl, siteUrl }] }
 */
export async function POST(req: Request) {
  try {
    const { filenames, preset }: { filenames: string[]; preset: string } = await req.json();

    if (!Array.isArray(filenames) || filenames.length === 0) {
      return Response.json({ error: "filenames array is required" }, { status: 400 });
    }
    if (!preset) {
      return Response.json({ error: "preset is required" }, { status: 400 });
    }

    const outputDir = path.resolve(process.cwd(), "../output");
    const { resolveTokens } = _require("mode-agent/token-resolver");

    const timestamp = new Date().toISOString();
    const ts = timestamp.replace(/[:.]/g, "-");

    const results = await Promise.all(
      filenames.map(async (filename) => {
        const existing = JSON.parse(
          fs.readFileSync(path.join(outputDir, path.basename(filename)), "utf8")
        );

        // Re-resolve tokens with the new preset, using the existing brief.
        const { behavioral, resolvePalette, accent, presetName, presetDescription, paletteDriver } =
          resolveTokens(existing.brief, preset);

        // Remap palette per section. All slot content is left untouched.
        const remappedPage = (existing.page as Record<string, unknown>[]).map((section) => ({
          ...section,
          palette: resolvePalette(section.component as string),
        }));

        const safeLabel = (existing.variant as string).toLowerCase().replace(/\s+/g, "-");
        const newFilename = `page-${ts}-${safeLabel}.json`;
        const previewUrl = `/preview?file=${newFilename}`;
        const siteUrl = `/site?ts=${ts}&page=${safeLabel}`;

        const output = {
          ...existing,
          generated_at: timestamp,
          preset: presetName,
          preset_description: presetDescription,
          palette_driver: paletteDriver,
          behavioral_tokens: behavioral,
          accent_tokens: accent,
          page: remappedPage,
          preview_url: previewUrl,
          _repalette_from: path.basename(filename),
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
          preset: presetName as string,
          paletteDriver: paletteDriver as string,
          brief: existing.brief as Record<string, string>,
        };
      })
    );

    // Write a new site manifest so /site?ts= works for the re-paletteed output.
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
      siteUrl: `/site?ts=${ts}`,
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
