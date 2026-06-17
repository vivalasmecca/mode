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
 * Build sections from the beat sequence deterministically.
 * For each beat, finds components with that beat affinity that are also
 * eligible for the brief's archetype and funnel stage.
 */
function buildSectionsFromBeats(beats, brief, manifest) {
  // NavigationHeader and FooterMinimal are always eligible.
  const always = ["NavigationHeader", "FooterMinimal"];

  // Index: beat name → eligible component names
  const beatIndex = {};
  for (const c of manifest.components) {
    const eligible =
      always.includes(c.name) ||
      (c.archetypes.includes(brief.archetype) &&
        c.funnel_stages.includes(brief.funnel_stage));
    if (!eligible) continue;
    for (const beat of c.beats ?? []) {
      if (!beatIndex[beat]) beatIndex[beat] = [];
      beatIndex[beat].push(c.name);
    }
  }

  // One section per beat; drop beats with no eligible components.
  const sections = beats
    .map((beat) => ({
      name: beat.name,
      beat: beat.name,
      rationale: beat.rationale,
      candidate_components: beatIndex[beat.name] ?? [],
    }))
    .filter((s) => s.candidate_components.length > 0);

  return { beats, sections };
}

module.exports = { proposeIA };
