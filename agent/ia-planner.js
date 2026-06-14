/**
 * MODE IA Planner
 *
 * Takes a brief and manifest, proposes a section-by-section
 * information architecture for the page.
 *
 * Each section in the IA has:
 *   - name: human-readable section identifier
 *   - rationale: why this section belongs at this position
 *   - candidate_components: ordered list of component names from the manifest
 *     that could fill this slot (agent will select one)
 */

const Anthropic = require("@anthropic-ai/sdk");

let _client;
function getClient() {
  if (!_client) _client = new Anthropic();
  return _client;
}

/**
 * @param {object} brief - { audience, archetype, funnel_stage, goal, context_mode }
 * @param {object} manifest - parsed components.json
 * @returns {object} ia - { sections: [{ name, rationale, candidate_components }] }
 */
async function proposeIA(brief, manifest) {
  try {
    return await llmProposeIA(brief, manifest);
  } catch (err) {
    console.warn(`LLM IA planning failed (${err.message}), falling back to rule-based`);
    const { archetype, funnel_stage } = brief;
    const eligible = manifest.components.filter(
      (c) => c.archetypes.includes(archetype) && c.funnel_stages.includes(funnel_stage)
    );
    return buildRuleBasedIA(brief, eligible);
  }
}

async function llmProposeIA(brief, manifest) {
  const anthropic = getClient();

  // Send full manifest so LLM can reason about eligibility
  const components = manifest.components.map((c) => ({
    name: c.name,
    purpose: c.purpose,
    archetypes: c.archetypes,
    funnel_stages: c.funnel_stages,
    notes: c.notes,
  }));

  const message = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `You are a page architecture strategist for an intent-aware SaaS design system called MODE.

Your job: propose the optimal section-by-section information architecture for a landing page.

BRIEF:
${JSON.stringify(brief, null, 2)}

AVAILABLE COMPONENTS:
${JSON.stringify(components, null, 2)}

RULES:
1. Every page must start with NavigationHeader and end with FooterMinimal.
2. Order sections by narrative arc — establish context → build trust → prove value → drive decision → capture action.
3. Only include components whose archetypes array includes "${brief.archetype}" AND whose funnel_stages array includes "${brief.funnel_stage}". NavigationHeader and FooterMinimal are always eligible.
4. Each rationale must specifically reference the ${brief.archetype} archetype and ${brief.funnel_stage} funnel stage.
5. Propose 5–8 sections total.

Return ONLY valid JSON — no markdown, no explanation:
{
  "sections": [
    {
      "name": "human-readable section name",
      "rationale": "why this section belongs here, citing archetype and funnel stage",
      "candidate_components": ["ComponentName1", "ComponentName2"]
    }
  ]
}`,
      },
    ],
  });

  const text = message.content[0].text.trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON object in LLM response");

  const ia = JSON.parse(jsonMatch[0]);
  if (!ia.sections || !Array.isArray(ia.sections)) throw new Error("Invalid IA structure");
  return ia;
}

/**
 * Rule-based fallback — used when LLM call fails.
 */
function buildRuleBasedIA(brief, eligible) {
  const componentNames = eligible.map((c) => c.name);
  const always = ["NavigationHeader", "FooterMinimal"];

  const decisionArc = [
    { name: "Navigation", candidates: ["NavigationHeader"] },
    { name: "Hero", candidates: ["HeroPrimary", "HeroStatement"] },
    { name: "Social proof", candidates: ["SocialProofBar"] },
    { name: "Features", candidates: ["FeatureGrid", "StatBlock"] },
    { name: "Testimonial", candidates: ["TestimonialSingle"] },
    { name: "Pricing", candidates: ["PricingCard"] },
    { name: "Conversion", candidates: ["CTABanner"] },
    { name: "Footer", candidates: ["FooterMinimal"] },
  ];

  const sections = decisionArc
    .map((slot) => ({
      name: slot.name,
      rationale: `${slot.name} — ${brief.archetype} archetype at ${brief.funnel_stage} stage`,
      candidate_components: slot.candidates.filter(
        (c) => componentNames.includes(c) || always.includes(c)
      ),
    }))
    .filter((s) => s.candidate_components.length > 0);

  return { sections };
}

module.exports = { proposeIA };
