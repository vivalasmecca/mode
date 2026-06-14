/**
 * MODE Token Resolver
 *
 * Reads the deployment config from mode-tokens.json and resolves two things:
 *
 *   behavioral  — per-archetype behavioral rules (copy density, evidence level, CTA rules).
 *                 Used by the content generator to shape copy.
 *
 *   resolvePalette(componentName) — returns "light" | "neutral" | "dark" for a given
 *                 component given the brief's funnel stage. Written into the output JSON
 *                 so the UI can apply the right visual treatment at render time.
 *
 * The resolver is config-driven. Swap the deployment config in mode-tokens.json and the
 * same resolver produces a different mapping without any code changes.
 */

const tokenConfig = require("../tokens/mode-tokens.json");

/**
 * @param {object} brief - { archetype, funnel_stage, ... }
 * @returns {{ behavioral: object, resolvePalette: (componentName: string) => string }}
 */
function resolveTokens(brief) {
  const { archetype, funnel_stage } = brief;

  // Behavioral tokens: archetype-driven in this deployment
  const behavioral =
    tokenConfig.behavioral_tokens[archetype] ??
    tokenConfig.behavioral_tokens["Validator"];

  // Palette: resolved from the active preset's palette_map
  const preset = tokenConfig.presets[tokenConfig.active_preset];
  if (!preset) {
    throw new Error(`Unknown preset "${tokenConfig.active_preset}". Check tokens/mode-tokens.json.`);
  }

  // palette_key tells the resolver which brief field to use as the lookup dimension.
  // funnel-driven and feature-emphasis use "funnel_stage"; archetype-driven uses "archetype".
  const paletteKey = brief[preset.palette_key ?? "funnel_stage"] ?? "awareness";

  function resolvePalette(componentName) {
    const map = preset.palette_map[componentName];
    if (!map) return "light";
    return map[paletteKey] ?? "light";
  }

  return { behavioral, resolvePalette };
}

module.exports = { resolveTokens };
