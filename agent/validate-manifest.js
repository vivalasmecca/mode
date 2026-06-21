#!/usr/bin/env node
"use strict";

/**
 * MODE Manifest Validator
 *
 * Checks that every component declared in manifest/components.json has
 * a matching key in the MODULE_REGISTRY (ui/components/modules/index.ts).
 *
 * Surfaces the "unknown component" error at setup time, not at render time
 * in the Studio when a user tries to preview a page.
 *
 * Usage:
 *   node agent/validate-manifest.js
 *
 * Exit codes:
 *   0 — all components registered
 *   1 — one or more components missing from registry
 */

const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const COMPONENTS_JSON = path.join(PROJECT_ROOT, "manifest", "components.json");
const INDEX_TS = path.join(PROJECT_ROOT, "ui", "components", "modules", "index.ts");

function run() {
  // 1. Read manifest
  if (!fs.existsSync(COMPONENTS_JSON)) {
    console.error(`manifest/components.json not found at: ${COMPONENTS_JSON}`);
    process.exit(1);
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(COMPONENTS_JSON, "utf8"));
  } catch (err) {
    console.error(`Failed to parse manifest/components.json: ${err.message}`);
    process.exit(1);
  }

  const manifestNames = (manifest.components || []).map((c) => c.name);

  // 2. Read MODULE_REGISTRY from index.ts via regex
  //    Extracts keys from:  MODULE_REGISTRY: Record<string, ModuleComponent> = {
  //      Key1,
  //      Key2: AliasedImport,
  //      ...
  //    }
  if (!fs.existsSync(INDEX_TS)) {
    console.error(`MODULE_REGISTRY not found at: ${INDEX_TS}`);
    process.exit(1);
  }

  const indexSrc = fs.readFileSync(INDEX_TS, "utf8");

  // Extract the MODULE_REGISTRY block
  const registryMatch = indexSrc.match(
    /MODULE_REGISTRY[^{]*\{([^}]*)\}/s
  );
  if (!registryMatch) {
    console.error("Could not parse MODULE_REGISTRY from ui/components/modules/index.ts.");
    console.error("Expected: export const MODULE_REGISTRY: ... = { ... };");
    process.exit(1);
  }

  // Parse keys from the registry block
  // Handles: "ComponentName," and "ComponentName: SomeAlias,"
  const registryBlock = registryMatch[1];
  const registryKeys = new Set(
    [...registryBlock.matchAll(/^\s*(\w+)\s*[,:{]/gm)]
      .map((m) => m[1])
      .filter(Boolean)
  );

  // 3. Compare
  const missing = manifestNames.filter((name) => !registryKeys.has(name));
  const extra = [...registryKeys].filter(
    (key) => !manifestNames.includes(key) && key !== "MODULE_REGISTRY"
  );

  // 4. Report
  console.log(`\nManifest components: ${manifestNames.length}`);
  console.log(`Registry entries:    ${registryKeys.size}\n`);

  if (missing.length === 0 && extra.length === 0) {
    console.log("✓  All manifest components are registered. No gaps found.\n");
    process.exit(0);
  }

  if (missing.length > 0) {
    console.log(`✗  ${missing.length} component(s) in manifest but NOT in MODULE_REGISTRY:\n`);
    missing.forEach((name) => {
      console.log(
        `   ${name}\n` +
        `     → Add to ui/components/modules/index.ts:\n` +
        `       import { ${name} } from "./${name}";\n` +
        `       // In MODULE_REGISTRY: ${name},\n` +
        `     → Or run: node agent/ingest.js declarations/<your-decl>.json --write\n`
      );
    });
  }

  if (extra.length > 0) {
    console.log(`ℹ  ${extra.length} component(s) in registry but NOT in manifest:\n`);
    extra.forEach((name) => {
      console.log(
        `   ${name}\n` +
        `     → Add a components.json entry, or remove from registry if deprecated.\n`
      );
    });
  }

  // Exit with error code if any manifest components are unregistered
  process.exit(missing.length > 0 ? 1 : 0);
}

run();
