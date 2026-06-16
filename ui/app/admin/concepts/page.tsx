// Static reference doc for system owners.
// Explains every field in the Brief and Deployment panels.

function DocSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
        {title}
      </h2>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

function Field({
  name,
  type,
  children,
}: {
  name: string;
  type?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-1">
        <span className="font-mono text-sm text-indigo-700">{name}</span>
        {type && <span className="text-xs text-gray-400">{type}</span>}
      </div>
      <div className="text-sm text-gray-600 leading-relaxed pl-3 border-l-2 border-gray-100">
        {children}
      </div>
    </div>
  );
}

function Table({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | React.ReactNode)[][];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-200">
            {headers.map((h) => (
              <th key={h} className="pb-2 pr-6 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-gray-50 last:border-0">
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={`py-2 pr-6 align-top ${j === 0 ? "font-mono text-gray-800 text-xs" : "text-gray-600"}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-amber-50 border border-amber-100 rounded px-4 py-3 text-xs text-amber-800 leading-relaxed">
      {children}
    </div>
  );
}

export default function ConceptsPage() {
  return (
    <main>
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-12">

        {/* Intro */}
        <div className="max-w-2xl">
          <p className="text-sm text-gray-600 leading-relaxed">
            Reference for system owners. Explains what every field in the Brief and Deployment
            panels means, what values are valid, and how the field influences the output.
          </p>
        </div>

        {/* ── BRIEF ── */}
        <DocSection title="Brief">
          <p className="text-sm text-gray-500 -mt-2">
            The brief is the authorial act — the only input a content strategist or product team
            provides per page. Every IA decision, component selection, and copy directive flows
            from these five fields.
          </p>

          <Field name="audience" type="string · free text">
            Plain-language description of who this page is built for. Not resolved to a token —
            passed directly into the IA planner and content generator as context. Used by the LLM
            to calibrate vocabulary, assumed knowledge, and framing. Example:{" "}
            <span className="font-mono text-gray-700">"SaaS trial users"</span>,{" "}
            <span className="font-mono text-gray-700">"enterprise IT buyers"</span>.
          </Field>

          <Field name="archetype" type='"Mover" | "Validator" | "Explorer"'>
            <p className="mb-3">
              The user&apos;s decision-making identity. Stable across sessions — a Validator
              doesn&apos;t become a Mover because they&apos;ve visited twice. Archetype drives
              behavioral tokens (copy density, evidence level, CTA rules) and, in the
              archetype-driven preset, also drives palette.
            </p>
            <Table
              headers={["Archetype", "Identity", "What they need"]}
              rows={[
                [
                  "Mover",
                  "Acts fast, high confidence, low friction tolerance.",
                  "Minimal copy, strong singular CTA, no noise. Gets annoyed by over-explanation.",
                ],
                [
                  "Validator",
                  "Considered, trust-seeking, needs reassurance before committing.",
                  "Social proof, specificity, subheads, sourced evidence. Needs space to evaluate.",
                ],
                [
                  "Explorer",
                  "Discovery mode, not ready to commit, browsing.",
                  "Content-rich, low-pressure, navigational. Non-coercive CTAs. Thorough without urgency.",
                ],
              ]}
            />
          </Field>

          <Field name="funnel_stage" type='"awareness" | "consideration" | "decision" | "conversion"'>
            <p className="mb-3">
              Where the user sits in the purchase journey. Page-level declaration — not per-section.
              In the funnel-driven preset, funnel_stage drives palette; dark emphasis accumulates
              as the user moves toward conversion. In archetype-driven, it informs IA shape and
              copy pressure but does not drive palette.
            </p>
            <Table
              headers={["Stage", "User state", "Page job"]}
              rows={[
                [
                  "awareness",
                  "First contact. Little product knowledge.",
                  "Orient. Establish relevance. Soft CTA. Heavy value, light credibility.",
                ],
                [
                  "consideration",
                  "Actively evaluating options.",
                  "Differentiate. Build credibility. Moderate conversion pressure.",
                ],
                [
                  "decision",
                  "Ready to choose. Comparing final options.",
                  "Close. Heavy credibility + peer validation. Aggressive CTA. Recovery elements.",
                ],
                [
                  "conversion",
                  "At the point of action.",
                  "Minimal friction. Single focused CTA. Remove all obstacles to completing the action.",
                ],
              ]}
            />
          </Field>

          <Field name="goal" type="string · free text">
            What this page is trying to accomplish. Feeds into the IA planner and content generator
            as a directive. Not resolved to a token. Example:{" "}
            <span className="font-mono text-gray-700">"Convert trial to paid"</span>,{" "}
            <span className="font-mono text-gray-700">"Book a demo"</span>,{" "}
            <span className="font-mono text-gray-700">"Activate new signup"</span>.
          </Field>

          <Field name="context_mode" type='"organic" | "campaign" | "retargeting"'>
            <p className="mb-3">
              The environmental frame — how the user arrived and what exposure they&apos;re assumed
              to have. Influences how much re-orientation the page needs to provide and how
              aggressively it can move toward conversion.
            </p>
            <Table
              headers={["Mode", "Arrival signal", "Implication"]}
              rows={[
                [
                  "organic",
                  "Search, direct, or referral. No prior campaign exposure assumed.",
                  "Full educational arc. Don't skip orientation. User may know nothing.",
                ],
                [
                  "campaign",
                  "Paid ad or campaign. Message pre-exposure assumed.",
                  "Skip top-of-funnel re-orientation. Message match to campaign. Faster to CTA.",
                ],
                [
                  "retargeting",
                  "Prior site visit. High familiarity assumed.",
                  "Minimal re-orientation. Focus on the objection or friction from the prior visit. Conversion-forward.",
                ],
              ]}
            />
          </Field>
        </DocSection>

        {/* ── DEPLOYMENT ── */}
        <DocSection title="Deployment">
          <p className="text-sm text-gray-500 -mt-2">
            Deployment settings are declared once by the brand or design owner, not per page. They
            establish the visual logic of the entire site. The brief operates within these rules —
            it cannot override a deployment setting.
          </p>

          <Note>
            <strong>The deployment hierarchy:</strong> the preset is upstream of the brief. A brand
            owner picks a preset when they configure their MODE deployment. Behavioral signals
            (archetype, funnel stage) then operate within the preset&apos;s rules. The brief
            doesn&apos;t choose a preset — the deployment does.
          </Note>

          <Field name="preset" type="string · one of the configured presets">
            <p className="mb-3">
              The named visual deployment mechanism. Governs what emphasis means across the site —
              specifically, which sections get the dark palette treatment and why. Swapping the
              preset changes the palette logic without changing any component code.
            </p>
            <Table
              headers={["Preset", "What dark means", "When to use"]}
              rows={[
                [
                  "funnel-driven",
                  "Decision signal. Emphasis accumulates toward conversion moments — trust anchors and commitment surfaces are dark, top-of-funnel is light.",
                  "SaaS conversion pages, trial-to-paid flows, signup funnels.",
                ],
                [
                  "feature-emphasis",
                  "Substance signal. Spotlights product capabilities and metrics. CTA and pricing are understated — features are the story.",
                  "Product marketing pages where capabilities need to stand on their own.",
                ],
                [
                  "archetype-driven",
                  "Identity signal. Visual language expresses who the user is. Validator = heavy dark (authority). Mover = mostly light + one dark punch. Explorer = all neutral (open, spacious).",
                  "Multi-persona sites or flows where each archetype should feel like a distinct register.",
                ],
                [
                  "product-architecture-driven",
                  "Navigation signal. Palette tracks product structure — where in the product the user is, not who they are.",
                  "App dashboards, enterprise vs. starter tiers, feature modules with distinct ownership.",
                ],
              ]}
            />
          </Field>

          <Field name="palette_driver" type="string · which brief field drives palette lookup">
            <p className="mb-3">
              The brief field the resolver uses to look up a section&apos;s palette. Declared by
              the preset — you don&apos;t set this manually. The resolver reads the brief&apos;s
              value for this field and looks it up in the preset&apos;s palette_map.
            </p>
            <Table
              headers={["Preset", "palette_driver", "Example lookup"]}
              rows={[
                [
                  "funnel-driven",
                  "funnel_stage",
                  'brief.funnel_stage = "decision" → PricingCard → dark',
                ],
                [
                  "feature-emphasis",
                  "funnel_stage",
                  'brief.funnel_stage = "awareness" → StatBlock → dark (always)',
                ],
                [
                  "archetype-driven",
                  "archetype",
                  'brief.archetype = "Validator" → HeroPrimary → dark',
                ],
              ]}
            />
          </Field>
        </DocSection>

        {/* ── BEHAVIORAL TOKENS ── */}
        <DocSection title="Behavioral Tokens">
          <p className="text-sm text-gray-500 -mt-2">
            Behavioral tokens are archetype-driven and stable across all presets. They don&apos;t
            control visual treatment — they control how the content generator writes copy. A section
            rendered in the dark palette can still have terse, low-evidence copy if the archetype is
            Mover.
          </p>

          <Field name="copy_density" type='"low" | "medium" | "high"'>
            Controls the volume of copy per section. Low = terse: headline and one CTA, no body.
            High = thorough: headline, subhead, body copy, and possibly multiple supporting points.
            The content generator uses this as a directive for how much to write per slot.
          </Field>

          <Field name="evidence_density" type='"low" | "medium" | "high"'>
            Controls how much proof the content generator is expected to include. Low = assertion
            statements only (&ldquo;Industry-leading reliability&rdquo;). Medium = contextual
            evidence (percentages, named outcomes). High = sourced specifics (named companies,
            attributed stats, case study references).
          </Field>

          <Field name="subhead_policy" type='"always" | "optional" | "never"'>
            Whether sections should include a subhead beneath the headline. Always = the content
            generator must produce a subhead for every section that has a subhead slot. Optional =
            include when it adds clarity. Never = omit, even if the slot exists in the manifest.
          </Field>

          <Field name="require_trust_signal" type="boolean">
            Whether CTA sections and conversion moments must include a trust signal — a short
            reassurance line beneath the CTA (e.g. &ldquo;Cancel anytime&rdquo;,
            &ldquo;No long-term contract&rdquo;). Validator = yes. Mover = no — the extra copy
            adds friction for a user who&apos;s already decided.
          </Field>

          <Field name="allow_secondary_cta" type="boolean">
            Whether a secondary CTA can appear alongside the primary. Mover = no — a second option
            introduces hesitation for a decisive user. Validator and Explorer = yes — a secondary
            escape like &ldquo;Talk to our team first&rdquo; or &ldquo;See everything
            included&rdquo; serves users who aren&apos;t quite ready to commit.
          </Field>

          <Table
            headers={["Token", "Validator", "Mover", "Explorer"]}
            rows={[
              ["copy_density", "medium", "low", "high"],
              ["evidence_density", "high", "low", "medium"],
              ["subhead_policy", "always", "optional", "always"],
              ["require_trust_signal", "yes", "no", "no"],
              ["allow_secondary_cta", "yes", "no", "yes"],
            ]}
          />
        </DocSection>

      </div>
    </main>
  );
}
