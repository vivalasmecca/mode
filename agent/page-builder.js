/**
 * MODE Page Builder Agent
 *
 * Entry point. Orchestrates the full build flow:
 *   1. Accept brief (audience, intent, goal)
 *   2. Hand off to ia-planner for IA proposal
 *   3. Human approval of IA (CLI prompt or React UI)
 *   4. Hand off to component-selector to fill IA slots
 *   5. Generate semantic HTML output
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const { proposeIA } = require("./ia-planner");
const { selectComponents } = require("./component-selector");

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

function generateHTML(slots) {
  // TODO: render each selected component + populated slots into semantic HTML
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `page-${timestamp}.html`;
  const outputPath = path.join(OUTPUT_DIR, filename);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Generated Page</title>
</head>
<body>
  <!-- MODE generated page -->
  <!-- Slots: ${JSON.stringify(slots, null, 2)} -->
</body>
</html>`;

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(outputPath, html);
  return outputPath;
}

async function run(brief) {
  const manifest = loadManifest();

  console.log("\n── MODE Page Builder ──────────────────────────────");
  console.log(`Brief received: ${JSON.stringify(brief, null, 2)}\n`);

  // Step 1: IA proposal
  const ia = await proposeIA(brief, manifest);
  console.log("\nProposed Information Architecture:");
  ia.sections.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.name} — ${s.rationale}`);
  });

  // Step 2: Human approval
  const approval = await prompt("\nApprove this IA? (y to continue, or describe changes): ");
  if (approval.toLowerCase() !== "y") {
    console.log("IA revision not yet implemented. Exiting.");
    process.exit(0);
  }

  // Step 3: Component selection
  const slots = await selectComponents(ia, brief, manifest);
  console.log("\nSelected components:");
  slots.forEach((s) => console.log(`  ${s.section} → ${s.component}`));

  // Step 4: Generate output
  const outputPath = generateHTML(slots);
  console.log(`\nPage generated: ${outputPath}`);
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
