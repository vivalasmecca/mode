/**
 * MODE IA Planner
 *
 * Two-step planning:
 *   1. LLM proposes an ordered beat sequence for the page
 *      (Orientation, Credibility, Value, Evidence, Decision, Conversion, Recovery)
 *   2. System builds sections deterministically from the beat sequence —
 *      candidate components filtered by beat affinity + archetype + funnel stage
 *
 * Output:
 *   { beats: [{ name, rationale }], sections: [{ name, beat, rationale, candidate_components }] }
 */

const Anthropic = require("@anthropic-ai/sdk");

let _client;
function getClient() {
  if (!_client) _client = new Anthropic();
  return _client;
}

const BEAT_NAMES = [
  "Orientation",
  "Credibility",
  "Value",
  "Evidence",
  "Decision",
  "Conversion",
  "Recovery",
];

/** Rule-based beat sequences per funnel stage — used as LLM fallback. */
const BEAT_SEQUENCES = {
  awareness:     ["Orientation", "Value", "Credibility", "Conversion", "Recovery"],
  consideration: ["Orientation", "Credibility", "Value", "Evidence", "Conversion", "Recovery"],
  decision:      ["Orientation", "Credibility", "Evidence", "Decision", "Conversion", "Recovery"],
  conversion:    ["Orientation", "Decision", "Conversion", "Recovery"],
};

/**
 * @param {object} brief - { audience, archetype, funnel_stage, goal, context_mode }
 * @param {object} manifest - parsed components.json
 * @returns {object} ia - { beats, sections }
 */
async function proposeIA(brief, manifest) {
  let beats;
  try {
    beats = await llmPlanBeats(brief);
  } catch (err) {
    console.warn(`LLM beat planning failed (${err.message}), using rule-based fallback`);
    beats = ruleBasedBeats(brief);
  }
  return buildSectionsFromBeats(beats, brief, manifest);
}

/**
 * Ask the LLM to produce an ordered beat sequence with rationale.
 * Returns [{ name, rationale }] where name ∈ BEAT_NAMES.
 */
async function llmPlanBeats(brief) {
  const anthropic = getClient();

  const archetypeGuidance = {
    Mover:     "Fewer beats, direct path. Skip Evidence unless essential. Conversion beat as early as viable.",
    Validator: "Include Credibility and Evidence. Validator needs proof before committing.",
    Explorer:  "Include Value and Credibility. Explorer is in discovery mode — no pressure toward conversion.",
  };

  const message = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are a page strategy expert for MODE, an intent-aware SaaS design system.

Plan the narrative beat sequence for a landing page.

BRIEF:
${JSON.stringify(brief, null, 2)}

AVAILABLE BEATS (choose 4–7, in narrative order):
- Orientation: establishes context, who this is for, what the product does (always first)
- Credibility: trust signals, authority, social proof, customer logos
- Value: product capabilities, features, outcome promises
- Evidence: statistics, metrics, proof points, case study data
- Decision: pricing, plan comparison, final choice framing
- Conversion: CTA, commitment prompt, action capture
- Recovery: secondary paths, footer, exit handling (always last)

RULES:
1. Orientation must be first. Recovery must be last.
2. Conversion must appear immediately before Recovery.
3. Funnel stage guidance:
   - awareness: light — no Decision beat, soft Conversion
   - consideration: full depth — include Value, Evidence, and Credibility before Conversion
   - decision: Evidence and Decision required before Conversion
   - conversion: stripped — Orientation → Decision → Conversion → Recovery only
4. Archetype guidance: ${archetypeGuidance[brief.archetype] ?? "balance depth and action"}

Return ONLY valid JSON — no markdown, no explanation:
{
  "beats": [
    { "name": "BeatName", "rationale": "why this beat at this position for this brief" }
  ]
}`,
      },
    ],
  });

  const text = message.content[0].text.trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in beat planning response");
  const result = JSON.parse(jsonMatch[0]);
  if (!result.beats || !Array.isArray(result.beats)) throw new Error("Invalid beat structure");

  // Validate every beat name — reject hallucinated names
  for (const b of result.beats) {
    if (!BEAT_NAMES.includes(b.name)) {
      throw new Error(`Unknown beat name: "${b.name}"`);
    }
  }

  return result.beats;
}

/**
 * Rule-based fallback: derive beat sequence from funnel stage.
 */
function ruleBasedBeats(brief) {
  const sequence = BEAT_SEQUENCES[brief.funnel_stage] ?? BEAT_SEQUENCES.awareness;
  return sequence.map((name) => ({
    name,
    rationale: `${name} — ${brief.archetype} archetype at ${brief.funnel_stage} stage`,
  }));
}

/**
 * Human-readable section name for a content beat.
 * These become the unique keys used by the content generator.
 */
const BEAT_SECTION_NAMES = {
  Orientation: "Hero",
  Credibility: "Social proof",
  Value:       "Features",
  Evidence:    "Proof points",
  Decision:    "Pricing",
  Conversion:  "CTA",
};

/**
 * Build sections from the beat sequence deterministically.
 *
 * NavigationHeader and FooterMinimal are pinned as fixed structural sections
 * (always first and last) and are excluded from the content beat candidate
 * pools — this prevents section name collisions in the content generator.
 *
 * Each content beat gets a descriptive, unique section name (e.g. "Hero",
 * "Features") so the content generator can key output by section name without
 * collisions.
 */
function buildSectionsFromBeats(beats, brief, manifest) {
  const PINNED = ["NavigationHeader", "FooterMinimal"];

  // Index: beat name → eligible component names (pinned components excluded)
  const beatIndex = {};
  for (const c of manifest.components) {
    if (PINNED.includes(c.name)) continue;
    const eligible =
      c.archetypes.includes(brief.archetype) &&
      c.funnel_stages.includes(brief.funnel_stage);
    if (!eligible) continue;
    for (const beat of c.beats ?? []) {
      if (!beatIndex[beat]) beatIndex[beat] = [];
      beatIndex[beat].push(c.name);
    }
  }

  const sections = [];

  // Pinned: navigation always first
  sections.push({
    name: "Navigation",
    beat: "Orientation",
    rationale: "Global navigation — wayfinding and persistent CTA for the session.",
    candidate_components: ["NavigationHeader"],
  });

  // One content section per beat (Recovery is handled by the pinned footer)
  for (const beat of beats) {
    if (beat.name === "Recovery") continue;
    const candidates = beatIndex[beat.name] ?? [];
    if (candidates.length === 0) continue;
    sections.push({
      name: BEAT_SECTION_NAMES[beat.name] ?? beat.name,
      beat: beat.name,
      rationale: beat.rationale,
      candidate_components: candidates,
    });
  }

  // Pinned: footer always last
  sections.push({
    name: "Footer",
    beat: "Recovery",
    rationale: "Page close — brand mark, minimal navigation, and legal.",
    candidate_components: ["FooterMinimal"],
  });

  return { beats, sections };
}

module.exports = { proposeIA };
