/**
 * MODE Preset Switcher
 *
 * Writes active_preset in tokens/mode-tokens.json.
 * Next agent run will use the new preset.
 *
 * Usage:
 *   node agent/set-preset.js funnel-driven
 *   node agent/set-preset.js feature-emphasis
 */

const fs = require("fs");
const path = require("path");

const CONFIG_PATH = path.resolve(__dirname, "../tokens/mode-tokens.json");

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
const available = Object.keys(config.presets);
const requested = process.argv[2];

if (!requested) {
  console.log(`Active preset: ${config.active_preset}`);
  console.log(`Available:     ${available.join(", ")}`);
  process.exit(0);
}

if (!available.includes(requested)) {
  console.error(`Unknown preset "${requested}". Available: ${available.join(", ")}`);
  process.exit(1);
}

if (config.active_preset === requested) {
  console.log(`Already on preset: ${requested}`);
  process.exit(0);
}

const previous = config.active_preset;
config.active_preset = requested;
fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));

const preset = config.presets[requested];
console.log(`\nPreset: ${previous} → ${requested}`);
console.log(`${preset.description}\n`);
console.log("Run node agent/page-builder.js to generate with the new preset.");
