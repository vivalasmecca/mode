/**
 * MODE Page Builder Agent
 *
 * Entry point. Orchestrates the full build flow:
 *   1. Accept brief (audience, intent, goal)
 *   2. Hand off to ia-planner for IA proposal
 *   3. Human approval of IA (CLI prompt)
 *   4. Hand off to component-selector to fill IA slots
 *   5. Hand off to content-generator to populate all slot values
 *   6. Write JSON output + print preview URL
 */

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const { proposeIA } = require("./ia-planner");
const { selectComponents } = require("./component-selector");
const { populateContent } = require("./content-generator");

const MANIFEST_PATH = path.resolve(__dirname, "../manifest/components.json");
const OUTPUT_DIR = path.resolve(__dirname, "../output");

function loadManifest() {
  const raw = fs.readFileSync(MANIFEST_PATH, "utf8");
  return JSON.parse(raw);
}

function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

function generateOutput(brief, ia, page) {
  const timestamp = new Date().toISOString();
  const filename = `page-${timestamp.replace(/[:.]/g, "-")}.json`;
  const outputPath = path.join(OUTPUT_DIR, filename);

  const output = {
    schema_version: "1.0.0",
    generated_at: timestamp,
    brief,
    ia,
    page,
    preview_url: "http://localhost:3000/preview",
  };

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  return { outputPath, output };
}

async function run(brief) {
  const manifest = loadManifest();

  console.log("\n── MODE Page Builder ──────────────────────────────");
  console.log(`Brief received: ${JSON.stringify(brief, null, 2)}\n`);

  // Step 1: IA proposal
  console.log("Proposing information architecture...");
  const ia = await proposeIA(brief, manifest);
  console.log("\nProposed Information Architecture:");
  ia.sections.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.name}`);
    console.log(`     ${s.rationale}`);
  });

  // Step 2: Human approval
  const approval = await prompt("\nApprove this IA? (y to continue, or describe changes): ");
  if (approval.toLowerCase() !== "y") {
    console.log("IA revision not yet implemented. Exiting.");
    process.exit(0);
  }

  // Step 3: Component selection
  console.log("\nSelecting components...");
  const page = await selectComponents(ia, brief, manifest);
  console.log("\nSelected components:");
  page.forEach((s) => {
    console.log(`  ${s.section} → ${s.component} (${s.variant})`);
    if (s.reasoning) console.log(`     ↳ ${s.reasoning}`);
  });

  // Step 3.5: Content generation
  console.log("\nGenerating content...");
  const populatedPage = await populateContent(ia, page, brief, manifest);
  console.log("\nFilled slots:");
  populatedPage.forEach((s) => {
    const preview = Object.entries(s.slots)
      .filter(([, v]) => v !== null && v !== undefined && !Array.isArray(v) && typeof v !== "object")
      .slice(0, 2)
      .map(([k, v]) => `${k}: "${String(v).slice(0, 40)}"`)
      .join("  |  ");
    console.log(`  ${s.section}: ${preview || "(arrays/objects)"}`);
  });

  // Step 4: Write JSON output
  const { outputPath } = generateOutput(brief, ia, populatedPage);
  console.log(`\nOutput written: ${outputPath}`);
  console.log("Preview: http://localhost:3000/preview");
  console.log("────────────────────────────────────────────────────\n");
}

// CLI entry: node page-builder.js
if (require.main === module) {
  // Canonical test brief — use this to validate the agent end-to-end
  const testBrief = {
    audience: "SaaS trial users",
    archetype: "Validator",
    funnel_stage: "decision",
    goal: "Convert trial to paid",
    context_mode: "organic",
  };

  run(testBrief).catch(console.error);
}

module.exports = { run };
