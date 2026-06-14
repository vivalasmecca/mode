# MODE — Page Builder Agent

Intent-aware page builder for SaaS. Takes a brief, proposes an information architecture, selects components, writes JSON. A Next.js preview app renders the output.

**IP:** Hyve Digital. Prior works claim on file.

---

## Quick start

```bash
# Run the agent (from mode/)
node agent/page-builder.js

# Start the preview UI (from mode/ui/)
npm run dev
# → http://localhost:3001/preview
```

The agent pauses at the IA approval step. Type `y` to continue, or describe changes (revision flow TBD).

---

## Architecture

```
mode/
├── agent/
│   ├── page-builder.js        # Orchestrator. Runs the full pipeline, writes output JSON.
│   ├── ia-planner.js          # LLM call (Claude Opus) → proposes section IA from brief.
│   ├── component-selector.js  # LLM call (Claude Haiku) → selects component per IA slot.
│   └── content-generator.js   # LLM call (Claude Sonnet) → fills all slot values in one batch.
├── manifest/
│   ├── components.json        # 11 components with archetypes, funnel stages, variants, slots.
│   └── micro-blocks.json      # Primitive definitions.
├── tokens/
│   └── mode-tokens.json       # Token dimension structure (profiles not yet populated).
├── output/
│   └── *.json                 # Agent output files. Preview reads the most recent.
└── ui/                        # Next.js preview app.
    ├── app/preview/page.tsx   # Preview route — reads latest output JSON, renders modules.
    ├── components/
    │   ├── modules/           # One file per manifest component.
    │   └── blocks/            # Primitive micro-block components.
    └── lib/
        ├── types.ts           # Schema contract between agent output and UI.
        └── get-output.ts      # Reads latest JSON from output/.
```

### Three-tier model

```
SEMANTIC INTENT LAYER   — Why. Archetype, funnel stage, intent state, context mode.
MODULE LAYER            — What. Named, trackable component compositions.
MICRO-BLOCK LAYER       — How. Reusable primitives modules are built from.
```

### Four resolution dimensions

| Dimension | Scope | Values |
|-----------|-------|--------|
| Archetype | User identity (stable) | Mover, Validator, Explorer |
| Funnel stage | Page-level | awareness, consideration, decision, conversion |
| Intent state | Session-level | (TBD) |
| Context mode | Environmental | organic, campaign, retargeting |

---

## Current state

### Done

- **Agent pipeline** — brief → IA proposal → human approval → component selection → content generation → JSON output
- **Component manifest** — 11 components fully defined with archetypes, funnel stages, variants, slots, notes
- **Content layer** — single batched Sonnet call fills all slot values in one pass; archetype-aware tone (Validator = evidence-led/sourced, Mover = terse/direct); image and structural nav slots correctly skipped
- **Preview UI** — Next.js app renders agent output with no unknown components
- **Module registry** — NavigationHeader, HeroPrimary, SocialProofBar, StatBlock, FeatureGrid, TestimonialSingle, PricingCard, CTABanner, FooterMinimal (+ HeroStatement, ContentSection pending agent use)
- **Micro-blocks** — AuthorLockup, CTAButton, FeatureCard, HeadlineSubheadLockup, LogoStrip, PlaceholderSlot, PriceDisplay, TrustSignal

### Up next

| Item | Status | Notes |
|------|--------|-------|
| Token profiles | Not started | `mode-tokens.json` has dimension keys; `profiles` is empty. Need values for each archetype × funnel stage combination. |
| Token → component binding | Not started | No mechanism for resolved profiles to affect module rendering yet. |
| IA revision flow | Stubbed | `page-builder.js` exits if approval !== `y`. Revision loop not implemented. |
| Visual mapping tool | Open question | How designers set token values per dimension. Composition vs named profiles unresolved — revisit with 2–3 concrete examples. |
| HeroStatement, ContentSection | Not in UI | In manifest, not yet in module registry (no agent test case exercises them yet). |
| Component selector variant hallucination | Known bug | LLM occasionally returns combined variant names (e.g. `3-stat-with-source`) not in the manifest. Falls back to heuristics correctly but the LLM call is wasted. Fix: add explicit variant validation + retry. |

---

## Canonical test brief

```js
{
  audience: "SaaS trial users",
  archetype: "Validator",
  funnel_stage: "decision",
  goal: "Convert trial to paid",
  context_mode: "organic"
}
```

Used as the default when running `node agent/page-builder.js` directly.

---

## Token profiles (future task)

`tokens/mode-tokens.json` defines the four dimensions. The open question is whether token values are:

- **Composed** — each dimension contributes independently and values are combined at runtime
- **Named profiles** — `Validator × decision` is a single named profile with its own token set

Come back to this with 2–3 concrete examples of what a designer would actually configure before choosing an architecture.
