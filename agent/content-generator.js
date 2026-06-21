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

// Slots skipped regardless of component (image/structural slots)
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

// Text slots that must always be populated — strip "| null" from their type
// so the LLM cannot return null for them, regardless of manifest declaration.
const ALWAYS_REQUIRED = new Set([
  "headline",
  "quote",
  "attribution",
  "author_name",
  "author_title",
  "company",
  "plan_name",
  "price",
  "billing_period",
  "legal_text",
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
      // Only send slots that the chosen variant actually renders, if known.
      const variantSlotList = def.variant_slots?.[section.variant] ?? null;

      for (const [key, rawType] of Object.entries(def.slots)) {
        if (SKIP_KEYS.has(key)) continue;
        if (variantSlotList && !variantSlotList.includes(key)) continue;

        if (Array.isArray(rawType)) {
          slots_to_fill[key] = {
            type: "array",
            item_template: rawType[0],
            count: arrayCount(section.component, key, section.variant),
          };
        } else {
          // Strip "| null" for fields that must always be populated.
          const effectiveType = ALWAYS_REQUIRED.has(key)
            ? rawType.replace(/\s*\|\s*null/, "").trim()
            : rawType;
          slots_to_fill[key] = { type: effectiveType };
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

  const checkoutUrl =
    productContext?.checkout?.primary_url ||
    productContext?.checkout?.trial_url ||
    null;

  const productContextSection = productContext
    ? `\n\nPRODUCT CONTEXT — use this as the source of truth for all product facts. Do not invent claims that contradict or go beyond this data:\n${JSON.stringify(productContext, null, 2)}`
    : "";

  const brandBriefSection = brandBrief
    ? `\n\nBRAND BRIEF — follow the tone, messaging pillars, and claim territory defined here:\n${brandBrief}`
    : "";

  // Funnel stage context: tells the LLM how to interpret the audience field
  // at each stage. Without this, "SaaS trial users" in consideration stage
  // reads as "people already in a trial" rather than "people evaluating".
  const FUNNEL_STAGE_CONTEXT = {
    awareness:     "Visitor is discovering this product for the first time. Write as if they have not yet signed up, trialed, or committed to anything. Focus on problem framing and initial intrigue.",
    consideration: "Visitor is evaluating this product against alternatives. They may not have trialed yet — do not assume they have. Focus on education, differentiation, and helping them evaluate confidently.",
    decision:      "Visitor is actively deciding. They may be mid-trial or post-demo. Focus on resolving objections, reinforcing specific value, and making the decision feel safe.",
    conversion:    "Visitor is at the commitment moment. They are ready to act. Remove friction, maximise confidence, and make the next step obvious and easy.",
  };
  const funnelContext = FUNNEL_STAGE_CONTEXT[brief.funnel_stage] || "";
  const funnelSection = funnelContext
    ? `\n\nAUDIENCE CONTEXT — ${brief.funnel_stage} stage:\n${funnelContext}`
    : "";

  const contentNotesSection = brief.content_notes
    ? `\n\nCONTENT DIRECTION — additional instructions from the author, follow these exactly:\n${brief.content_notes}`
    : "";

  // The system block is stable across builds for the same product/brand config.
  // cache_control marks it for prompt caching — cache reads cost ~10% of input token price.
  // Caching activates only if this block exceeds the model's minimum token threshold.
  const systemText =
    `You are a conversion copywriter for MODE, an intent-aware SaaS design system.\n\n` +
    `Write slot content for every section of a landing page based on the brief and sections provided.\n\n` +
    `SLOT TYPE RULES — follow exactly:\n` +
    `- type "string"            → write a plain string value\n` +
    `- type "string | null"     → write a string, or null if not warranted by the variant/archetype\n` +
    `- type "CTAButton"         → return {"label": "...", "href": "${checkoutUrl || "#"}"}\n` +
    `- type "CTAButton | null"  → return {"label": "...", "href": "${checkoutUrl || "#"}"} or null\n` +
    `- type "array" with object item_template → return exactly count objects matching the template shape\n` +
    `- type "array" with string item_template → return exactly count plain strings\n\n` +
    `COPY RULES:\n` +
    `- No filler, no lorem ipsum. Every line of copy must earn its place.\n` +
    `- Use the rationale field to inform the angle for each section.\n` +
    `- Stats: use specific, credible-sounding numbers (e.g. "47%", "2.3x", "< 9 min").\n` +
    `  Populate the source field when present (e.g. "2024 customer survey", "internal data").\n` +
    `- Feature icons: single relevant emoji per feature (e.g. "⚡", "🔒", "📊", "🧩").\n` +
    `- Feature descriptions (FeatureGrid): outcome-oriented benefit statements, not feature labels.\n` +
    `- PricingCard features: short, scannable strings (e.g. "Unlimited workspaces").\n` +
    `- legal_text (FooterMinimal): concise copyright line, e.g. "© 2025 Acme Inc. All rights reserved."\n` +
    `- NavigationHeader cta_primary: the session's primary conversion action (e.g. "Upgrade now").\n` +
    `- Keep headline copy under 12 words. Subheads under 25 words.\n` +
    `- body (ContentSection, HeroStatement): 3–4 sentences of structured, specific argument. ALWAYS populate — never omit this key.\n` +
    `- subhead (HeroPrimary, CTABanner): write a real subhead; do not omit.\n` +
    `- CRITICAL: every key listed in slots_to_fill MUST appear in your response for that section. Omitting a key leaves a visible placeholder on the page.` +
    productContextSection +
    brandBriefSection;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    system: [
      { type: "text", text: systemText, cache_control: { type: "ephemeral" } },
    ],
    messages: [
      {
        role: "user",
        content:
          `BRIEF:\n${JSON.stringify(brief, null, 2)}\n\n` +
          `TONE — ${brief.archetype} archetype:\n${toneGuide}` +
          funnelSection +
          contentNotesSection +
          `\n\nSECTIONS:\n${JSON.stringify(spec, null, 2)}\n\n` +
          `Return ONLY valid JSON keyed by the exact section name — no markdown, no explanation:\n` +
          `{\n  "<exact section name>": {\n    "<slot_key>": <value>\n  }\n}`,
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
    const merged = { ...section.slots, ...filled };

    // Warn about any surviving bracket-style stubs (e.g. "[body]", "[subhead]")
    // that the LLM omitted from its response, leaving the component-selector stub.
    for (const [k, v] of Object.entries(merged)) {
      if (typeof v === "string" && /^\[[^\]]+\]$/.test(v)) {
        console.warn(`  Unfilled stub in ${section.section}.${k}: "${v}" — LLM did not populate this slot`);
      }
    }

    return { ...section, slots: merged };
  });
}

module.exports = { populateContent };
