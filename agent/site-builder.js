/**
 * MODE Site Builder
 *
 * Orchestrates a full site build across all pages and variants declared in
 * config/site.json. Runs the full agent pipeline (proposeIA → selectComponents
 * → resolveTokens → populateContent) for every page×variant combo in parallel,
 * then injects coherent nav links into every NavigationHeader.
 *
 * Filename scheme:
 *   Multi-variant page:  page-{ts}-{pageSlug}-{variantSlug}.json
 *   Single-variant page: page-{ts}-{pageSlug}.json
 *
 * Site manifest labels:
 *   Homepage variants → variantSlug (e.g. "awareness")
 *     — app/page.tsx routes by label === detectedFunnelStage ✓
 *   Single-variant pages → pageSlug (e.g. "pricing")
 *
 * After generation:
 *   - Writes output/{filename} for each page-variant
 *   - Writes output/site-{ts}.json with page + route fields
 *   - Updates config/pages.json with filename for single-variant pages
 */

"use strict";

const path = require("path");
const fs = require("fs");

const { proposeIA } = require("./ia-planner");
const { selectComponents } = require("./component-selector");
const { resolveTokens } = require("./token-resolver");
const { populateContent } = require("./content-generator");

/**
 * Mutates each output in-place: finds the NavigationHeader section and sets
 * slots.nav_links to the site-level nav links from site.json.
 */
function injectNavLinks(results, navLinks) {
  for (const r of results) {
    for (const section of r.output.page) {
      if (section.component === "NavigationHeader") {
        section.slots = section.slots ?? {};
        section.slots.nav_links = navLinks;
        break;
      }
    }
  }
}

/**
 * Builds the full site from a parsed site.json config.
 *
 * @param {object} siteConfig  Parsed config/site.json
 * @param {object} opts
 * @param {string} opts.dataRoot  Absolute path to the mode data root
 *                                (parent of output/, config/, manifest/)
 * @returns {{ ts: string, siteManifest: object }}
 */
async function buildSite(siteConfig, { dataRoot }) {
  const manifestPath = path.join(dataRoot, "manifest/components.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

  const timestamp = new Date().toISOString();
  const ts = timestamp.replace(/[:.]/g, "-");
  const outputDir = path.join(dataRoot, "output");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  // Expand all page × variant combos
  const combos = siteConfig.pages.flatMap((pageSpec) =>
    pageSpec.variant_values.map((variantValue) => ({ pageSpec, variantValue }))
  );

  // Run the full pipeline for every combo in parallel
  const results = await Promise.all(
    combos.map(async ({ pageSpec, variantValue }) => {
      const pageSlug = pageSpec.label.toLowerCase().replace(/\s+/g, "-");
      const variantSlug = variantValue.toLowerCase().replace(/\s+/g, "-");
      const isMultiVariant = pageSpec.variant_values.length > 1;

      // Compose the per-page brief
      const brief = {
        ...siteConfig.shared_brief,
        ...pageSpec.brief_overrides,
        [pageSpec.variant_dimension]: variantValue,
      };

      // Step 1 — IA planning
      const ia = await proposeIA(brief, manifest);

      // Step 2 — Component selection
      const page = await selectComponents(ia, brief, manifest);

      // Step 3 — Token resolution
      const {
        behavioral,
        resolvePalette,
        accent,
        presetName,
        presetDescription,
        paletteDriver,
      } = resolveTokens(brief, pageSpec.preset);

      // Apply palette mode to each section
      const pageWithPalette = page.map((section) => ({
        ...section,
        palette: resolvePalette(section.component),
      }));

      // Step 4 — Content generation
      const populatedPage = await populateContent(
        ia,
        pageWithPalette,
        brief,
        manifest,
        behavioral
      );

      // Filename: multi-variant uses variantSlug suffix; single-variant omits it
      const filename = isMultiVariant
        ? `page-${ts}-${pageSlug}-${variantSlug}.json`
        : `page-${ts}-${pageSlug}.json`;

      const previewUrl = `/admin/preview?file=${filename}`;

      // Site manifest label: homepage variants use variantSlug (matches routing),
      // single-variant pages use pageSlug (e.g. "pricing").
      const siteLabel = isMultiVariant ? variantSlug : pageSlug;
      const siteUrl = `/admin/site?ts=${ts}&page=${siteLabel}`;

      const output = {
        schema_version: "1.1.0",
        generated_at: timestamp,
        variant: isMultiVariant ? variantValue : pageSpec.label,
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

      return {
        pageSpec,
        pageSlug,
        variantSlug,
        isMultiVariant,
        siteLabel,
        filename,
        previewUrl,
        siteUrl,
        output,
        presetName,
        presetDescription,
        paletteDriver,
        brief,
      };
    })
  );

  // Inject coherent nav links into every NavigationHeader after all generation
  injectNavLinks(results, siteConfig.nav_links);

  // Write all output files
  for (const r of results) {
    fs.writeFileSync(
      path.join(outputDir, r.filename),
      JSON.stringify(r.output, null, 2)
    );
  }

  // Write site manifest with page + route fields
  const firstResult = results[0];
  const siteManifest = {
    schema_version: "1.0.0",
    built_at: timestamp,
    ts,
    preset: firstResult.presetName,
    palette_driver: firstResult.paletteDriver,
    brief: firstResult.brief,
    pages: results.map((r) => ({
      label: r.siteLabel,
      filename: r.filename,
      previewUrl: r.previewUrl,
      siteUrl: r.siteUrl,
      page: r.pageSpec.label,
      route: r.pageSpec.route,
    })),
  };
  fs.writeFileSync(
    path.join(outputDir, `site-${ts}.json`),
    JSON.stringify(siteManifest, null, 2)
  );

  // Update config/pages.json — add filename for single-variant pages so
  // their routes can read files directly without cross-build searching.
  const configDir = path.join(dataRoot, "config");
  const pagesPath = path.join(configDir, "pages.json");
  let pagesRegistry = [];
  try {
    if (fs.existsSync(pagesPath)) {
      pagesRegistry = JSON.parse(fs.readFileSync(pagesPath, "utf8"));
    }
  } catch {
    // ignore malformed or missing pages.json
  }

  for (const r of results) {
    if (!r.isMultiVariant) {
      const entry = pagesRegistry.find((e) => e.route === r.pageSpec.route);
      if (entry) {
        entry.filename = r.filename;
      }
    }
  }
  fs.writeFileSync(pagesPath, JSON.stringify(pagesRegistry, null, 2));

  return { ts, siteManifest };
}

module.exports = { buildSite };
