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

/**
 * @param {object} brief - { audience, archetype, funnel_stage, goal, context_mode }
 * @param {object} manifest - parsed components.json
 * @returns {object} ia - { sections: [{ name, rationale, candidate_components }] }
 */
async function proposeIA(brief, manifest) {
  const { archetype, funnel_stage } = brief;

  // Filter manifest to components that match archetype and funnel stage
  const eligible = manifest.components.filter(
    (c) =>
      c.archetypes.includes(archetype) && c.funnel_stages.includes(funnel_stage)
  );

  // TODO: Replace this rule-based stub with LLM-driven IA proposal.
  // The LLM should reason about page narrative arc, not just filter eligibility.
  // Prompt should include: brief, eligible components with their purpose/notes,
  // and ask for an ordered section list with rationale.

  const ia = buildRuleBasedIA(brief, eligible);
  return ia;
}

/**
 * Stub IA builder — rule-based placeholder until LLM planning is wired in.
 * Returns a sensible default structure for decision-stage pages.
 */
function buildRuleBasedIA(brief, eligible) {
  const componentNames = eligible.map((c) => c.name);

  // Every page gets navigation and footer
  const always = ["NavigationHeader", "FooterMinimal"];

  // Decision-stage default arc
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
      rationale: `${slot.name} section — filtered for ${brief.archetype} archetype at ${brief.funnel_stage} stage`,
      candidate_components: slot.candidates.filter((c) => componentNames.includes(c) || always.includes(c)),
    }))
    .filter((s) => s.candidate_components.length > 0);

  return { sections };
}

module.exports = { proposeIA };
