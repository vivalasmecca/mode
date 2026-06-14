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

### Page zones (concept — not yet built)

A zone is a unit of narrative work on the page. Not "here is a testimonial" but "here is the trust-building moment." Zones sit above sections in the hierarchy:

```
Page → Zones → Sections → Components → Micro-blocks
```

**Proposed zone types:**

| Zone | Job |
|---|---|
| Orientation | Establishes what page this is |
| Credibility | Proof that the claim is real |
| Value | What you actually get |
| Peer Validation | Others have made this decision |
| Decision | The commitment moment |
| Conversion | The close |
| Recovery | Last chance before they leave |

**Funnel stage controls zone weight and presence.** Zones don't just vary in content — they vary in whether they exist at all, how many sections fill them, and where they sit in the page order.

| Zone | Awareness | Consideration | Decision |
|---|---|---|---|
| Orientation | Heavy | Light | Minimal |
| Credibility | Light | Medium | Heavy |
| Value | Heavy | Heavy | Condensed |
| Peer Validation | — | Medium | Heavy |
| Decision | — | Light | Heavy |
| Conversion | Soft | Moderate | Aggressive |
| Recovery | — | — | Present |

**Archetype controls density and component choice within each zone.** For the same zone at the same funnel stage, archetype determines how many sections fill it and which components are used:

```
Credibility zone, decision stage:
  Validator → LogoBar + StatBlock (sourced) + TestimonialSingle   [3 sections]
  Mover     → LogoBar only                                         [1 section]
  Explorer  → StatBlock (contextual) + ContentSection              [2 sections, different type]
```

Funnel stage and archetype are genuinely independent dimensions doing different jobs: funnel stage sets the zone map, archetype sets the intensity and component choice within each zone.

**Implications for the build when this gets tackled:**
- The IA planner needs a two-step generation: zone map first, then section fill per zone
- `manifest/components.json` needs zone affinity per component (which zones a component belongs to)
- Output JSON should carry zone labels so the label overlay can surface them
- The current flat section list is a simplification of this model — compatible, just not zone-aware yet

---

## Current state

### Done

- **Agent pipeline** — brief → IA proposal → human approval → component selection → token resolution → content generation → JSON output
- **Component manifest** — 11 components fully defined with archetypes, funnel stages, variants, slots, notes
- **Content layer** — single batched Sonnet call fills all slot values in one pass; behavioral tokens drive tone directives (evidence density, trust signal requirements, CTA rules, copy density)
- **Token config layer** — `mode-tokens.json` has full deployment config: palette modes, behavioral tokens per archetype, palette_map per component × funnel stage. `token-resolver.js` resolves both. `palette` field written to every section in output JSON.
- **Palette-aware modules** — all 9 module components accept `palette?: PaletteMode` and apply correct bg, text, subtext, muted, border, iconBg classes. Block components (FeatureCard, AuthorLockup, TrustSignal) accept palette from parent.
- **Preview UI** — Next.js app renders agent output with no unknown components
- **Module registry** — NavigationHeader, HeroPrimary, SocialProofBar, StatBlock, FeatureGrid, TestimonialSingle, PricingCard, CTABanner, FooterMinimal (+ HeroStatement, ContentSection pending agent use)
- **Micro-blocks** — AuthorLockup, CTAButton, FeatureCard, HeadlineSubheadLockup, LogoStrip, PlaceholderSlot, PriceDisplay, TrustSignal
- **Label overlay** — toggleable dev tool shows MODE classification (section name, component, variant, archetype, funnel stage, IA rationale) above each section

### Up next

| Item | Status | Notes |
|------|--------|-------|
| IA revision flow | Stubbed | `page-builder.js` exits if approval !== `y`. Revision loop not implemented. |
| Visual mapping tool | Open question | How designers set token values per dimension. Composition vs named profiles unresolved — revisit with 2–3 concrete examples. |
| HeroStatement, ContentSection | Not in UI | In manifest, not yet in module registry (no agent test case exercises them yet). |
| CMS as revision layer | Future | LLM authors the content; CMS is where humans revise before publish. Agent pushes to Contentful via Management API. Content types derived from manifest slot schemas. See note below. |
| Page zones | Future concept | Zones sit above sections — each zone has a narrative job (Credibility, Value, Conversion, etc.). Funnel stage controls which zones exist and their weight; archetype controls density and component choice within each zone. Requires IA planner rework and zone affinity on manifest. See architecture section. |
| Multi-variant generation | Future | One brief generates all archetype variants in a single run. Output schema holds Validator/Mover/Explorer variants side by side. Business owner previews and approves each. Customer is served the right one at runtime — no LLM at request time. |

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

## The emergent CMS (product concept)

Traditional CMSes are declarative. A human opens a form and states the content: types the headline, picks the image, writes the body. The CMS is a structured container for human intention expressed field by field.

This system inverts that.

**The brief is the authorial act. The content emerges from it.**

A human states intent — audience, archetype, funnel stage, goal — and the agent produces the page: structure, component selection, and all copy. The content isn't declared, it's generated. The CMS becomes a persistence layer for what emerged, and a lightweight interface for human exception handling before publish.

This makes it an **emergent CMS**: content is the output of a process, not the input to one.

The human's role shrinks to three things:
1. Write the brief (the only truly creative act in the loop)
2. Approve or revise the IA (structural judgment)
3. Fix exceptions in the output (a stat that's wrong, a headline that doesn't land, the real logo)

Everything else is generated. The CMS isn't where content is created — it's where it lands.

This has downstream implications for how the CMS interface should be designed. It doesn't need to be a rich editing environment. It needs to be a fast review and exception-handling surface: here's what was generated, here's why each decision was made, here's what needs a human eye. Most fields will ship as-is. The interface should make the exceptional edits fast, not optimize for creating everything from scratch.

The manifest slot schemas, the IA rationale fields, and the MODE metadata (`archetype`, `funnel_stage`, `variant`) all become editorial context — not just data, but the reasoning behind the data. An editor who understands why a headline was written a certain way makes better revision decisions than one staring at a text field with no context.

---

## CMS as revision layer (future task)

The model here is intentionally different from how CMSes are usually used.

**The LLM is the author. The CMS is the editor.**

The agent generates the page — IA, component selection, and all slot content — from a brief. That output is the first draft. A headless CMS sits downstream as a lightweight interface for humans to review and revise anything before it goes live, not as the place where content is created from scratch.

This inverts the normal CMS workflow. Most teams open Contentful and start typing. Here the content arrives already written, already structured, already archetype-aware. A human's job is exception handling: fix a stat that's wrong, swap a headline that doesn't land, upload the real logo.

Implications for how this gets built:

- **Agent writes to CMS via Management API** — after a run, the agent pushes its output directly to Contentful as draft entries. The page is immediately reviewable without any copy-paste step.
- **One content type per component** — derived directly from `manifest/components.json` slot schemas. Editors see field-level slots (`headline`, `subhead`, `cta_primary`), not a blob of JSON. That structure is what makes revision fast.
- **Entry-per-section, page references sections** — matches the IA model and enables section reuse. An editor can fix one testimonial and it updates everywhere it's referenced.
- **MODE metadata as fields** — `archetype`, `funnel_stage`, `variant` should be visible in the CMS. Editors need context for why something was written the way it was. "This headline is terse because Mover archetype" is useful information when deciding whether to change it.
- **Image slots as asset references** — the agent leaves these null; a human fills them in Contentful. The slot shape `{src: string, alt: string}` maps cleanly to a Contentful Asset URL.
- **Rich text** — keep `body` as plain string for now. Defer rich text formatting until there's a real editing workflow that needs it.

No action yet. The right time to build this is when there's a real brief, a real page, and someone who needs to publish it.

---

## Token layer — platform model

### Deployment hierarchy

Two distinct layers of decision-making govern every page:

```
Brand/design owner (one-time, at deployment setup)
└── Declares a preset — the visual deployment mechanism
      "We are using the archetype-driven preset.
       In our system, dark means buyer identity."

Content/strategy team (per page, per brief)
└── Submits a brief — behavioral signals that drive composition
      archetype    → behavioral tokens → copy direction, IA shape, component selection
      funnel_stage → palette resolution (if funnel-driven preset)
      └── Page output: sections, components, palettes, copy
```

The **preset** is upstream of the brief. It's a policy declaration, not a per-page choice. A brand owner picks it once when they configure their MODE deployment. It governs the visual logic of the entire site.

The **behavioral signals** (archetype, funnel stage) are per-brief. They operate *within* the preset's rules and drive what actually gets generated: which IA sections exist, which components fill them, what copy rules apply, and how palette resolves given the preset's driver.

The brief doesn't pick a preset. The deployment does.

### Platform vs. deployment

The four resolution dimensions (archetype, funnel stage, intent state, context mode) are fixed axes of the platform. What a **deployment** configures is which dimension drives which token behavior.

The resolver itself is generic — it reads `mode-tokens.json` and resolves tokens for any brief + component. The config is what makes one deployment different from another. Swap the config, get a different visual system. The components don't know which dimension produced their palette; they only know what classes to render.

### The four presets

These aren't different systems — they're the same resolver with a different config. But as a product, they're the likely trailheads for any design or brand owner picking up the kit. Each one answers a different question about what emphasis *means* in their context.

| Preset | What "dark" means | Palette driver | When to use |
|---|---|---|---|
| **Funnel-driven** (current) | "This is where you decide" — emphasis accumulates toward conversion moments | Funnel stage | SaaS conversion pages, trial-to-paid flows, signup |
| **Archetype-driven** | "This product is built for people like you" — visual language expresses buyer identity | Archetype | Multi-persona sites where Validator, Mover, Explorer each get a distinct visual register |
| **Product-architecture-driven** | "You are inside this part of the product" — palette tracks product structure | Product tier / surface | App dashboards, enterprise vs. starter tiers, feature modules with distinct ownership |
| **Feature-emphasis** | "Look at this capability" — base palette stays neutral, emphasis spotlights substance | Editorial intent | Product marketing pages where the features *are* the story; CTA is secondary to capability proof |

The four aren't the only valid configurations — they're the configurations a design or brand owner is most likely to reach for first. The resolver handles all of them; what changes is the `palette_map` in `mode-tokens.json` and which dimension populates it.

**The key distinction between 1 and 4:** Funnel-driven uses dark as a *decision signal* — urgency increases as the user approaches conversion. Feature-emphasis uses dark as a *substance signal* — it marks capabilities worth pausing on. A feature section might be dark; the CTA could stay light. The logic inverts.

**The key distinction between 2 and 3:** Archetype-driven adapts visual language to *who the user is*. Product-architecture-driven adapts it to *where in the product they are*. One is identity-anchored, the other is navigation-anchored.

### A fifth concept — in motion, not yet a preset

Observed on Shopify's marketing site: top-level product pages are globally dark. The blog is globally light. Neither is section-by-section assignment — the whole page exists in one ambient mode as a *brand register declaration*. Dark = "this is the flagship product experience." Light = "this is editorial/content." The palette isn't signaling anything about what happens within the page; it's signaling what kind of page this is.

This is a different question from presets 1–4. Those all ask: *what does emphasis mean within sections of this page?* The Shopify pattern asks: *what mode does this entire page exist in?*

A second, more complex pattern appeared alongside it: an overlay rendered with a brand color background (purple) but with components inside rendered in their light/white palette. The surface background and the component palette were decoupled. In the current MODE model, section bg and component text colors come from the same palette object — they travel together. That overlay breaks the assumption.

**Two distinct concepts worth separating:**

| Concept | What it is | Current status |
|---|---|---|
| **Page ambient** | Palette declared at the page level; all sections inherit it; overlays are the contrast break | Not a preset yet — would require a page-level mode field on the brief, not section-by-section resolution |
| **Surface/overlay decoupling** | Surface bg (brand color) independent of component palette mode (light/dark) | Not in current architecture — would require `surfaceBg` separate from `componentPalette` in the palette utility |

Neither fits cleanly into the preset model as built. The preset system resolves palette section-by-section from a brief. "Page ambient" would need a page-level mode declaration that sections inherit rather than resolve individually. Surface decoupling would need the palette primitive split into two independent axes.

**Don't build this yet.** Come back when there are 2–3 real examples of where this pattern is needed. The right architecture will be clearer with concrete cases than from first principles.

### What varies vs. what stays stable

**Stable across all contexts:** spacing scale, type scale, radius, shadows. Standard design system territory.

**Varies by context:** palette mode — which color treatment a section renders in.

```
light   — white bg, default text. Neutral canvas.
neutral — gray-50 bg, default text. Slight separation.
dark    — gray-900 bg, inverted text. Emphasis and urgency.
```

### This deployment: funnel-driven

Palette mode is an emphasis signal. Dark marks the moments that matter — commitment points, trust anchors, conversion gates. It accumulates as the user moves toward decision.

Behavioral tokens (copy density, evidence requirements, CTA rules) are driven by archetype.

### Token config file

`tokens/mode-tokens.json` holds the full deployment config:
- `deployment` — which dimensions drive which behaviors
- `palette_modes` — the three named modes with their Tailwind class sets
- `behavioral_tokens` — per-archetype behavioral rules
- `palette_map` — component → funnel stage → palette mode (bridge until zone layer is built)

The resolution engine (`agent/token-resolver.js`) reads this config and resolves tokens for any given brief + component. Components receive a `palette` prop and a behavioral token set; they don't know which dimension produced them.
