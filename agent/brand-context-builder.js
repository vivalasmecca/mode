/**
 * MODE Brand Context Builder
 *
 * Ingestion agent: fetches URLs, extracts structured product context
 * and drafts a brand brief using Claude.
 *
 * Runs once per client setup (not per build). Output files are read by
 * content-generator.js at slot-population time to ground copy in real
 * product truth.
 */

const Anthropic = require("@anthropic-ai/sdk");

let _client;
function getClient() {
  if (!_client) _client = new Anthropic();
  return _client;
}

// ─── HTML → readable text ────────────────────────────────────────────────────

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchUrl(url) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MODE-bot/1.0)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    return stripHtml(html).slice(0, 8000); // cap per URL to control token usage
  } catch (err) {
    console.warn(`  [brand-context] Failed to fetch ${url}: ${err.message}`);
    return "";
  }
}

// ─── Extraction ──────────────────────────────────────────────────────────────

/**
 * Fetches URLs and extracts structured product context.
 * Only includes information explicitly present — does not invent.
 */
async function extractProductContext(urls) {
  const texts = await Promise.all(urls.map(fetchUrl));
  const combined = texts.filter(Boolean).join("\n\n---\n\n");

  if (!combined.trim()) {
    throw new Error("No content could be fetched from the provided URLs.");
  }

  const anthropic = getClient();
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `Extract product information from the web content below and return valid JSON.

RULES:
- Only include information explicitly present in the content.
- Do not invent, infer, or embellish. Leave arrays empty if data is absent.
- proof_points: only include if a specific number or metric is stated (e.g. "47% faster").
- pricing.tiers: only include if pricing tiers are explicitly mentioned. Extract per-tier feature lists if present.
- pricing.trial: only include if a free trial or free plan is explicitly stated.
- checkout.primary_url: if a "Buy now", "Get started", or checkout link URL is present in the content, capture it here.
- social_proof: only include real quotes or customer names mentioned.

Return this exact JSON structure (no markdown fences, no explanation):
{
  "product_name": "",
  "one_liner": "",
  "features": [{ "name": "", "description": "", "benefit": "" }],
  "proof_points": [{ "value": "", "label": "", "source": null }],
  "pricing": {
    "billing_periods": [],
    "annual_discount": null,
    "tiers": [
      {
        "tier": "",
        "monthly_price": null,
        "annual_price": null,
        "description": "",
        "features": [],
        "cta_label": "",
        "cta_url": null
      }
    ],
    "trial": { "length": null, "card_required": null }
  },
  "checkout": {
    "primary_url": null,
    "trial_url": null,
    "currency": "USD"
  },
  "social_proof": [{ "quote": "", "attribution": "", "company": null }],
  "differentiators": []
}

CONTENT:
${combined}`,
      },
    ],
  });

  const text = message.content[0].text.trim();
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON in extraction response");
  return JSON.parse(match[0]);
}

// ─── Brand brief draft ───────────────────────────────────────────────────────

/**
 * Drafts a brand brief in markdown from the fetched content + extracted
 * product context. PMM should review and edit before using in builds.
 */
async function draftBrandBrief(urls, productContext) {
  const texts = await Promise.all(urls.map(fetchUrl));
  const combined = texts.filter(Boolean).join("\n\n---\n\n").slice(0, 6000);

  const anthropic = getClient();
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: `Draft a brand brief in markdown based on the website content and product context below. Base it only on what is evident from the content — do not invent positioning that isn't implied.

PRODUCT CONTEXT:
${JSON.stringify(productContext, null, 2)}

WEBSITE CONTENT:
${combined}

Return a markdown document with exactly these sections. Be concise and specific — avoid generic filler:

# Brand Brief

## Tone of voice
[2–3 sentences describing how this brand communicates: register, vocabulary, what it avoids]

## Messaging pillars
[3–4 bullet points — the core ideas the brand consistently returns to]

## Positioning statement
[One paragraph: what the product is, who it's for, and why it's differentiated]

## Claim territory
[What claims are clearly supported by the content. Flag anything that seems like a stretch or needs verification.]`,
      },
    ],
  });

  return message.content[0].text.trim();
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Primary entry point. Fetches URLs once, runs extraction and brief draft.
 * Returns { productContext, brandBrief }.
 */
async function buildBrandContext(urls) {
  const productContext = await extractProductContext(urls);
  const brandBrief = await draftBrandBrief(urls, productContext);
  return { productContext, brandBrief };
}

module.exports = { buildBrandContext, extractProductContext, draftBrandBrief };
