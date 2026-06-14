/**
 * MODE Content Generator
 *
 * Fills all slot values for a page in a single batched LLM call.
 * Content is archetype-aware (tone, specificity, evidence level) and
 * variant-informed (array lengths, nullable slot behavior).
 *
 * Skips image slots and structural navigation — those are populated
 * separately or left null.
 *
 * Output: same page array with slots populated. Falls back to stubs on error.
 */

const Anthropic = require("@anthropic-ai/sdk");

let _client;
function getClient() {
  if (!_client) _client = new Anthropic();
  return _client;
}

// Slots skipped regardless of component
const SKIP_KEYS = new Set([
  "logo",
  "media",
  "photo",
  "company_logo",
  "attribution_logo",
  "logos",
  "nav_links",
  "nav_columns",
  "social_links",
]);

const TONE = {
  Validator:
    "Evidence-led and specific. Cite real-sounding outcomes with numbers. " +
    "Use source attribution on stats. Build trust through specificity, not superlatives. " +
    "Give the reader space to evaluate — no pressure, just proof.",
  Mover:
    "Terse and action-forward. Every word earns its place. Strong verbs. No hedging. " +
    "CTA copy is direct and confident. One message, one action per section.",
  Explorer:
    "Content-rich and low-pressure. Informative, broad framing. No hard sell. " +
    "Navigational and discovery-friendly. Prioritise depth over urgency.",
};

/**
 * How many items to generate for array slots, based on component + variant.
 */
function arrayCount(componentName, slotKey, variant) {
  if (componentName === "StatBlock" && slotKey === "stats") {
    return variant === "4-stat" ? 4 : 3;
  }
  if (componentName === "FeatureGrid" && slotKey === "features") {
    return variant === "list-style" ? 5 : 6;
  }
  if (componentName === "PricingCard" && slotKey === "features") {
    return 6;
  }
  return 3; // safe default for any other array
}

/**
 * Build the per-section slot spec sent to the LLM.
 * Each slot gets a type hint and, for arrays, an item template + count.
 */
function buildSpec(ia, page, manifest) {
  const componentMap = Object.fromEntries(manifest.components.map((c) => [c.name, c]));

  return page.map((section, i) => {
    const def = componentMap[section.component];
    const iaSection = ia.sections[i] || {};
    const slots_to_fill = {};

    if (def) {
      for (const [key, rawType] of Object.entries(def.slots)) {
        if (SKIP_KEYS.has(key)) continue;

        if (Array.isArray(rawType)) {
          slots_to_fill[key] = {
            type: "array",
            item_template: rawType[0],
            count: arrayCount(section.component, key, section.variant),
          };
        } else {
          slots_to_fill[key] = { type: rawType };
        }
      }
    }

    return {
      section: section.section,
      component: section.component,
      variant: section.variant,
      rationale: iaSection.rationale || "",
      slots_to_fill,
    };
  });
}

async function callLLM(spec, brief) {
  const tone = TONE[brief.archetype] || TONE.Validator;
  const anthropic = getClient();

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `You are a conversion copywriter for MODE, an intent-aware SaaS design system.

Write slot content for every section of a landing page.

BRIEF:
${JSON.stringify(brief, null, 2)}

TONE — ${brief.archetype} archetype:
${tone}

SLOT TYPE RULES — follow exactly:
- type "string"            → write a plain string value
- type "string | null"     → write a string, or null if not warranted by the variant/archetype
- type "CTAButton"         → return {"label": "...", "href": "#"}
- type "CTAButton | null"  → return {"label": "...", "href": "#"} or null
- type "array" with object item_template → return exactly count objects matching the template shape
- type "array" with string item_template → return exactly count plain strings

COPY RULES:
- No filler, no lorem ipsum. Every line of copy must earn its place.
- Use the rationale field to inform the angle for each section.
- Stats: use specific, credible-sounding numbers (e.g. "47%", "2.3x", "< 9 min").
  Populate the source field when present (e.g. "2024 customer survey", "internal data").
- Feature icons: single relevant emoji per feature (e.g. "⚡", "🔒", "📊", "🧩").
- Feature descriptions (FeatureGrid): outcome-oriented benefit statements, not feature labels.
- PricingCard features: short, scannable strings (e.g. "Unlimited workspaces").
- legal_text (FooterMinimal): concise copyright line, e.g. "© 2025 Acme Inc. All rights reserved."
- NavigationHeader cta_primary: the session's primary conversion action (e.g. "Upgrade now").
- Keep headline copy under 12 words. Subheads under 25 words.

SECTIONS:
${JSON.stringify(spec, null, 2)}

Return ONLY valid JSON keyed by the exact section name — no markdown, no explanation:
{
  "<exact section name>": {
    "<slot_key>": <value>
  }
}`,
      },
    ],
  });

  const text = message.content[0].text.trim();
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON object in content generation response");
  return JSON.parse(match[0]);
}

/**
 * Main export. Returns page with all fillable slots populated.
 * Falls back to original stubs if the LLM call fails.
 */
async function populateContent(ia, page, brief, manifest) {
  const spec = buildSpec(ia, page, manifest);

  let generated;
  try {
    generated = await callLLM(spec, brief);
  } catch (err) {
    console.warn(`  Content generation failed (${err.message}), keeping stubs`);
    return page;
  }

  return page.map((section) => {
    const filled = generated[section.section];
    if (!filled) {
      console.warn(`  No content returned for section: ${section.section}`);
      return section;
    }
    return { ...section, slots: { ...section.slots, ...filled } };
  });
}

module.exports = { populateContent };
