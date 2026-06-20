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
 *   - reasoning: LLM rationale citing manifest notes
 *   - slots: populated slot values (stubs until content layer is wired in)
 */

const Anthropic = require("@anthropic-ai/sdk");

let _client;
function getClient() {
  if (!_client) _client = new Anthropic();
  return _client;
}

/**
 * @param {object} ia - approved IA from ia-planner
 * @param {object} brief - original brief
 * @param {object} manifest - parsed components.json
 * @returns {Array} slots - [{ section, component, variant, reasoning, slots }]
 */
async function selectComponents(ia, brief, manifest) {
  const componentMap = Object.fromEntries(manifest.components.map((c) => [c.name, c]));

  // Build beat lookup: section name → beat name
  const beatBySection = Object.fromEntries(
    ia.sections.map((s) => [s.name, s.beat ?? null])
  );

  try {
    const selections = await llmSelectComponents(ia, brief, componentMap);
    return selections.map((sel) => {
      const component = componentMap[sel.component];

      // Validate variant against the manifest. LLMs occasionally hallucinate
      // combined names (e.g. "3-stat-with-source") that don't exist.
      let variant = sel.variant;
      if (component && variant && !component.variants.includes(variant)) {
        console.warn(`  Variant "${variant}" not in manifest for ${sel.component} — using heuristic`);
        variant = pickVariant(component, brief);
      }

      return {
        section: sel.section,
        beat: beatBySection[sel.section] ?? null,
        component: sel.component,
        variant,
        reasoning: sel.reasoning,
        slots: stubSlots(component ? component.slots : {}, brief),
      };
    });
  } catch (err) {
    console.warn(`LLM component selection failed (${err.message}), falling back to heuristics`);
    return ia.sections.map((section) => {
      const selected = pickComponent(section.candidate_components, brief, componentMap);
      const component = componentMap[selected];
      if (!component) {
        return { section: section.name, beat: section.beat ?? null, component: selected, variant: null, reasoning: null, slots: {} };
      }
      return {
        section: section.name,
        beat: section.beat ?? null,
        component: selected,
        variant: pickVariant(component, brief),
        reasoning: null,
        slots: stubSlots(component.slots, brief),
      };
    });
  }
}

/**
 * Single batched Claude API call for all sections.
 */
async function llmSelectComponents(ia, brief, componentMap) {
  const anthropic = getClient();

  const sectionsPayload = ia.sections.map((s) => ({
    section: s.name,
    candidates: s.candidate_components.map((name) => {
      const c = componentMap[name];
      if (!c) return { name };
      return { name, purpose: c.purpose, variants: c.variants, notes: c.notes };
    }),
  }));

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              `You are a component selection expert for MODE, an intent-aware SaaS design system.\n\n` +
              `SELECTION RULES:\n` +
              `- For awareness funnel stage: prefer "editorial" variant on hero components — it is the high-expression layout appropriate for the attention-earning moment\n` +
              `- For conversion funnel stage hero components: prefer "text-only" variant — slim page title and subhead only, no media, no secondary CTA, so it orients without competing with the decision moment below\n` +
              `- For Validator archetype: prefer variants containing "social-proof", "with-photo", or "with-source"\n` +
              `- For Mover archetype: prefer variants containing "minimal" or "text-only"\n` +
              `- For Explorer archetype: prefer variants containing "editorial" or "with-social-proof" on hero components — discovery tone, breathing room, low conversion pressure\n` +
              `- Your reasoning MUST cite a specific phrase from that component's notes field`,
            cache_control: { type: "ephemeral" },
          },
          {
            type: "text",
            text:
              `\n\nBRIEF:\n${JSON.stringify(brief, null, 2)}\n\n` +
              `SECTIONS AND CANDIDATES:\n${JSON.stringify(sectionsPayload, null, 2)}\n\n` +
              `Return ONLY a valid JSON array — no markdown, no explanation:\n` +
              `[\n  {\n    "section": "exact section name from input",\n    "component": "ComponentName",\n    "variant": "variant-name",\n    "reasoning": "specific reasoning citing the notes"\n  }\n]`,
          },
        ],
      },
    ],
  });

  const text = message.content[0].text.trim();
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("No JSON array in LLM response");

  const selections = JSON.parse(jsonMatch[0]);
  if (!Array.isArray(selections)) throw new Error("LLM response is not an array");
  return selections;
}

/**
 * Heuristic fallback: pick best component by archetype position.
 */
function pickComponent(candidates, brief, componentMap) {
  if (candidates.length === 1) return candidates[0];
  const scored = candidates.map((name) => {
    const c = componentMap[name];
    if (!c) return { name, score: 0 };
    const idx = c.archetypes.indexOf(brief.archetype);
    return { name, score: idx === -1 ? -1 : 10 - idx };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].name;
}

/**
 * Heuristic fallback: pick variant by archetype preference.
 */
function pickVariant(component, brief) {
  if (!component.variants || component.variants.length === 0) return null;
  if (component.variants.length === 1) return component.variants[0];

  // Awareness stage: prefer editorial on hero components
  if (brief.funnel_stage === "awareness" && component.variants.includes("editorial")) {
    return "editorial";
  }

  // Decision stage: prefer with-price — surfaces the offer before any proof sections
  if (brief.funnel_stage === "decision" && component.variants.includes("with-price")) {
    return "with-price";
  }

  // Conversion stage: prefer text-only on hero components — slim title, no competing elements
  if (brief.funnel_stage === "conversion" && component.variants.includes("text-only")) {
    return "text-only";
  }

  if (brief.archetype === "Validator") {
    const pref = component.variants.find(
      (v) => v.includes("social-proof") || v.includes("with-photo") || v.includes("with-source")
    );
    if (pref) return pref;
  }

  if (brief.archetype === "Mover") {
    const pref = component.variants.find(
      (v) => v.includes("minimal") || v.includes("text-only")
    );
    if (pref) return pref;
  }

  if (brief.archetype === "Explorer") {
    const pref = component.variants.find(
      (v) => v.includes("editorial") || v.includes("with-social-proof")
    );
    if (pref) return pref;
  }

  return component.variants[0];
}

/**
 * Stub slot values. Placeholder strings until content generation layer.
 */
function stubSlots(slots, brief) {
  if (!slots) return {};
  const stubbed = {};
  for (const [key, type] of Object.entries(slots)) {
    if (Array.isArray(type)) {
      stubbed[key] = [];
    } else if (typeof type === "string" && type.includes("null")) {
      stubbed[key] = null;
    } else {
      stubbed[key] = `[${key}]`;
    }
  }
  return stubbed;
}

module.exports = { selectComponents };
