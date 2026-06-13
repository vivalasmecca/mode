/**
 * MODE Component Selector
 *
 * Takes an approved IA and brief, selects the best component
 * for each IA slot from the manifest, and returns populated slot data.
 *
 * Each output slot has:
 *   - section: IA section name
 *   - component: selected component name
 *   - variant: selected variant
 *   - slots: populated slot values (empty stubs until content layer is wired in)
 */

/**
 * @param {object} ia - approved IA from ia-planner
 * @param {object} brief - original brief
 * @param {object} manifest - parsed components.json
 * @returns {Array} slots - [{ section, component, variant, slots }]
 */
async function selectComponents(ia, brief, manifest) {
  const componentMap = Object.fromEntries(
    manifest.components.map((c) => [c.name, c])
  );

  return ia.sections.map((section) => {
    const selected = pickComponent(section.candidate_components, brief, componentMap);
    const component = componentMap[selected];

    if (!component) {
      return { section: section.name, component: selected, variant: null, slots: {} };
    }

    const variant = pickVariant(component, brief);
    const populatedSlots = stubSlots(component.slots, brief);

    return {
      section: section.name,
      component: selected,
      variant,
      slots: populatedSlots,
    };
  });
}

/**
 * Pick the best component from candidates for this brief.
 * TODO: Replace heuristic with LLM selection reasoning against manifest notes.
 */
function pickComponent(candidates, brief, componentMap) {
  if (candidates.length === 1) return candidates[0];

  // Prefer components where the archetype appears first in the archetypes array
  // (proxy for "this component was designed with this archetype as primary")
  const scored = candidates.map((name) => {
    const component = componentMap[name];
    if (!component) return { name, score: 0 };
    const archetypeIndex = component.archetypes.indexOf(brief.archetype);
    const score = archetypeIndex === -1 ? -1 : 10 - archetypeIndex;
    return { name, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].name;
}

/**
 * Pick the most appropriate variant for the brief.
 * TODO: Replace with LLM reasoning against variant descriptions in manifest notes.
 */
function pickVariant(component, brief) {
  if (!component.variants || component.variants.length === 0) return null;
  if (component.variants.length === 1) return component.variants[0];

  // Validator archetype heuristics
  if (brief.archetype === "Validator") {
    const validatorPreferred = component.variants.find(
      (v) => v.includes("social-proof") || v.includes("with-photo") || v.includes("with-source")
    );
    if (validatorPreferred) return validatorPreferred;
  }

  // Mover archetype heuristics
  if (brief.archetype === "Mover") {
    const moverPreferred = component.variants.find(
      (v) => v.includes("minimal") || v.includes("text-only")
    );
    if (moverPreferred) return moverPreferred;
  }

  // Default: first variant
  return component.variants[0];
}

/**
 * Stub out slot values. Returns empty strings as placeholders.
 * TODO: Replace with content generation layer (LLM-populated from brief).
 */
function stubSlots(slots, brief) {
  if (!slots) return {};
  const stubbed = {};
  for (const [key, type] of Object.entries(slots)) {
    if (type.includes("null")) {
      stubbed[key] = null;
    } else if (Array.isArray(type)) {
      stubbed[key] = [];
    } else {
      stubbed[key] = `[${key}]`;
    }
  }
  return stubbed;
}

module.exports = { selectComponents };
