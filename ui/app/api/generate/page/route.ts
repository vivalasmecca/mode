import { createRequire } from "module";
import * as fs from "fs";
import * as path from "path";
import { DATA_ROOT } from "@/lib/get-output";

// Anchor require resolution to the project root (mode/ui/) so Node.js finds
// mode-agent in mode/ui/node_modules/ regardless of where Turbopack puts
// the compiled file at runtime.
const _require = createRequire(path.resolve(process.cwd(), "__route__"));

export const dynamic = "force-dynamic";
export const maxDuration = 120;

interface VariantInput {
  label: string;
  brief: Record<string, unknown>;
  ia: { sections: unknown[] };
  preset?: string;
}

export async function POST(req: Request) {
  try {
    const { variants }: { variants: VariantInput[] } = await req.json();

    const manifestPath = path.join(DATA_ROOT, "manifest/components.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

    const { selectComponents } = _require("mode-agent/component-selector");
    const { resolveTokens } = _require("mode-agent/token-resolver");
    const { populateContent } = _require("mode-agent/content-generator");

    const timestamp = new Date().toISOString();
    const ts = timestamp.replace(/[:.]/g, "-");
    const outputDir = path.join(DATA_ROOT, "output");
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    // Run the full pipeline for all variants in parallel.
    const results = await Promise.all(
      variants.map(async ({ label, brief, ia, preset }) => {
        const page = await selectComponents(ia, brief, manifest);

        const { behavioral, resolvePalette, accent, presetName, presetDescription, paletteDriver } =
          resolveTokens(brief, preset);

        const pageWithPalette = page.map((section: Record<string, unknown>) => ({
          ...section,
          palette: resolvePalette(section.component as string),
        }));

        const populatedPage = await populateContent(
          ia,
          pageWithPalette,
          brief,
          manifest,
          behavioral
        );

        const safeLabel = label.toLowerCase().replace(/\s+/g, "-");
        const filename = `page-${ts}-${safeLabel}.json`;
        const previewUrl = `/admin/preview?file=${filename}`;
        const siteUrl = `/admin/site?ts=${ts}&page=${safeLabel}`;

        const output = {
          schema_version: "1.1.0",
          generated_at: timestamp,
          variant: label,
          preset: presetName,
          preset_description: presetDescription,
          palette_driver: paletteDriver,
          brief,
          behavioral_tokens: behavioral,
          accent_tokens: accent,
          ia,
          page: populatedPage,
          preview_url: previewUrl,
        };

        fs.writeFileSync(path.join(outputDir, filename), JSON.stringify(output, null, 2));

        return { label, safeLabel, filename, previewUrl, siteUrl, presetName, paletteDriver, brief };
      })
    );

    // Write site manifest so /site can load all pages for this build.
    const siteManifest = {
      schema_version: "1.0.0",
      built_at: timestamp,
      ts,
      preset: results[0].presetName,
      palette_driver: results[0].paletteDriver,
      brief: results[0].brief as Record<string, string>,
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
