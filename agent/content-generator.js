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
const fs = require("fs");
const path = require("path");

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
    "Build trust through specificity, not superlatives. Give the reader space to evaluate — no pressure, just proof.",
  Mover:
    "Terse and action-forward. Every word earns its place. Strong verbs. No hedging. " +
    "CTA copy is direct and confident. One message, one action per section.",
  Explorer:
    "Content-rich and low-pressure. Informative, broad framing. No hard sell. " +
    "Navigational and discovery-friendly. Prioritise depth over urgency.",
};

/**
 * Build a tone + behavioral guide from the archetype base and resolved behavioral tokens.
 * Behavioral tokens make implicit rules explicit in the LLM prompt.
 */
function buildToneGuide(archetype, behavioral) {
  const base = TONE[archetype] || TONE.Validator;
  if (!behavioral) return base;

  const rules = [];

  if (behavioral.evidence_density === "high") {
    rules.push('Stats and claims MUST include source attribution (e.g. "2024 customer survey", "G2 data", "internal data").');
  } else if (behavioral.evidence_density === "low") {
    rules.push("Use direct assertions only — no source citations needed.");
  }

  if (behavioral.require_trust_signal) {
    rules.push('Include a trust signal near primary CTAs (e.g. "No credit card required", "Cancel anytime").');
  }

  if (!behavioral.allow_secondary_cta) {
    rules.push("One CTA per section — set secondary CTA fields to null.");
  }

  if (behavioral.copy_density === "low") {
    rules.push("Keep copy extremely concise — headlines ≤8 words, body text 1 line maximum.");
  } else if (behavioral.copy_density === "high") {
    rules.push("Provide fuller explanations — 3–4 lines for body text where the slot allows.");
  }

  if (behavioral.subhead_policy === "optional") {
    rules.push("Subheads are optional — use empty string or null if a section doesn't need one.");
  }

  if (rules.length === 0) return base;
  return `${base}\n\nBEHAVIORAL RULES (follow exactly):\n${rules.map((r) => `- ${r}`).join("\n")}`;
}

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

/**
 * Reads product-context.json and brand-brief.md from context/ if they exist
 * and have meaningful content. Re-read on every call so edits take effect
 * without a server restart.
 */
function loadBrandContext() {
  const contextDir = path.resolve(__dirname, "../context");

  let productContext = null;
  try {
    const pcPath = path.join(contextDir, "product-context.json");
    if (fs.existsSync(pcPath)) {
      const parsed = JSON.parse(fs.readFileSync(pcPath, "utf8"));
      if (parsed.product_name) productContext = parsed;
    }
  } catch {}

  let brandBrief = null;
  try {
    const bbPath = path.join(contextDir, "brand-brief.md");
    if (fs.existsSync(bbPath)) {
      const text = fs.readFileSync(bbPath, "utf8").trim();
      // Skip the template placeholder
      if (text && !text.includes("_Populate via the Brand Setup tab")) {
        brandBrief = text;
      }
    }
  } catch {}

  return { productContext, brandBrief };
}

async function callLLM(spec, brief, behavioral) {
  const toneGuide = buildToneGuide(brief.archetype, behavioral);
  const { productContext, brandBrief } = loadBrandContext();
  const anthropic = getClient();

  const productContextSection = productContext
    ? `\n\nPRODUCT CONTEXT — use this as the source of truth for all product facts. Do not invent claims that contradict or go beyond this data:\n${JSON.stringify(productContext, null, 2)}`
    : "";

  const brandBriefSection = brandBrief
    ? `\n\nBRAND BRIEF — follow the tone, messaging pillars, and claim territory defined here:\n${brandBrief}`
    : "";

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
${toneGuide}${productContextSection}${brandBriefSection}

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
async function populateContent(ia, page, brief, manifest, behavioral = null) {
  const spec = buildSpec(ia, page, manifest);

  let generated;
  try {
    generated = await callLLM(spec, brief, behavioral);
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
