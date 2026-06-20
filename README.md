# MODE — Page Builder Agent

Intent-aware page builder for SaaS. Takes a brief, proposes an information architecture, selects components, writes JSON. A Next.js preview app renders the output.

**IP:** Hyve Digital. Prior works claim on file.

---

## Quick start

```bash
# Start the UI (from mode/ui/)
npm run dev
# → http://localhost:3000/admin
```

All generation happens through the dashboard. The CLI agent (`node agent/page-builder.js`) still works but the UI is the primary interface.

---

## Integration levels

Full documentation in `docs/integration-guide.md`. Summary:

**Level 0 — Routing and palette** (no component work required)
Visitors are detected and routed to the variant file matching their signal. Each section gets a palette assignment. Your components apply the palette. Effort: middleware config + serving output files.

**Level 1 — Component registration and slot filling**
MODE's agent generates IA, selects your components, and populates your content slots. Requires registering your components in `manifest/components.json` and accepting a `slots` prop. This is the main integration layer.

**Level 2 — Behavioral tokens and archetype-differentiated copy** (optional)
Copy density, evidence level, and CTA rules vary by visitor archetype. A Validator gets longer copy with proof points; a Mover gets one-line headlines and a single CTA. This is optional — a single-archetype build produces high-quality content without behavioral token differentiation. Companies that want simpler copy rules can skip this layer entirely and adopt it later.

**What you don't need to do:** rewrite your components, replace your CMS, sync with Figma. The integration surface is a JSON schema, not a platform lock-in.

---

## Deploying to Vercel

Output files (generated pages + routing config) live in the repo and are committed so Vercel can serve them. The workflow is always local → commit → push → Vercel redeploys.

### How it works

Vercel's `buildCommand` (in `vercel.json`) pre-copies `output/`, `config/`, `tokens/`, `context/`, and `manifest/` into `ui/mode-data/` before the Next.js build runs. At runtime, the app reads from `mode-data/` instead of the parent directory. No database, no external storage — the output JSON files are the source of truth and travel with the repo.

`config/routing.json` is the pointer. The homepage reads it to know which build's files to serve:

```json
{ "ts": "2026-06-16T03-55-29-918Z" }
```

If this file doesn't exist, the homepage shows "No active build."

### The workflow

1. **Build** — go to `/admin/build`, fill in a brief, approve the IA proposals, generate all variants. Output JSON files land in `mode/output/`.

2. **Activate** — click **Activate** in the Build tab. This writes `config/routing.json` locally pointing at the new build's timestamp. The homepage (`/`) will now serve this build.

3. **Deploy** — click **Deploy** (only enabled after Activate). This calls `POST /api/admin/deploy`, which:
   - `git add output/ config/`
   - `git commit -m "Deploy 2026-06-16 10:30"`
   - `git push origin main`

4. **Vercel picks it up** — a push to `main` triggers a Vercel build. The build copies the committed files into `mode-data/` and deploys. The live site now serves the new build.

### Admin routes

The dashboard and preview routes are under `/admin` and are blocked on Vercel (403) unless `ADMIN_KEY` is set. They are only accessible locally.

| Local URL | Purpose |
|-----------|---------|
| `localhost:3000/admin` | Overview — latest output metadata + design tokens card |
| `localhost:3000/admin/build` | Build tab — Site Build card (all pages at once) + per-page build form |
| `localhost:3000/admin/edit` | Slot editor — per-section field editing with CTA + link support |
| `localhost:3000/admin/brand` | Brand context editor — URL extraction + product context + brand brief |
| `localhost:3000/admin/palette` | Palette map editor — per-preset grid + accent editor |
| `localhost:3000/admin/studio` | Studio — full-screen canvas, live token remapping, component swapper, variant editor, design system |
| `localhost:3000/admin/run` | Deploy panel — commit and push content files to trigger Vercel build |
| `localhost:3000/admin/concepts` | Reference docs for all brief fields and system concepts |
| `localhost:3000/admin/preview?file=page-{ts}-{variant}.json` | Preview a specific variant |
| `localhost:3000/admin/site?ts={ts}` | Site view — all variants from a build with linked nav |

### Testing routing on the live site

The proxy reads query params as direct overrides, making it easy to test any variant without touching cookies.

**Direct overrides** (clearest for testing):

| URL | Variant served |
|-----|---------------|
| `mode-nu.vercel.app/?page=awareness` | awareness |
| `mode-nu.vercel.app/?page=consideration` | consideration |
| `mode-nu.vercel.app/?page=decision` | decision |
| `mode-nu.vercel.app/?page=conversion` | conversion |

**UTM signals** (tests the real routing logic):

| URL | Detected stage |
|-----|---------------|
| `mode-nu.vercel.app/?utm_medium=email` | consideration |
| `mode-nu.vercel.app/?utm_medium=retargeting` | decision |
| `mode-nu.vercel.app/?utm_campaign=checkout-now` | conversion |

**Cookie progression** — organic visits to `/` accumulate against a threshold before the stage advances. The current threshold is 3 visits at a stage before moving to the next. UTM and query param signals bypass the threshold and pin the stage immediately. Two cookies are written: `mode_funnel_stage` (current stage) and `mode_stage_visits` (visit count at current stage). Clear both to reset to awareness.

The homepage is capped at `decision` — conversion is never served at `/` because that register belongs to `/pricing`. Once the cookie reaches conversion, the homepage still serves the decision variant.

To change the threshold: edit `STAGE_ADVANCE_THRESHOLD` in `ui/proxy.ts`. Exposing this to the dashboard (without requiring a code edit) is a future improvement.

**Default** — `mode-nu.vercel.app/` with no params and no cookie → awareness.

### If the live site shows "No active build"

Either `config/routing.json` doesn't exist, or it points to a build whose output files aren't committed. Fix:

```bash
# Check what's in routing.json
cat config/routing.json

# Check that the referenced output files are committed
git ls-files output/ | grep {ts}

# If missing, commit and push
git add output/ config/
git commit -m "Activate build {ts}"
git push origin main
```

---

## Architecture

```
mode/
├── agent/
│   ├── site-builder.js        # Site orchestrator. Builds all pages × variants in one run.
│   ├── page-builder.js        # Single-page CLI orchestrator (not used by UI).
│   ├── ia-planner.js          # LLM call (Claude Opus) → proposes beat sequence + sections.
│   ├── component-selector.js  # LLM call (Claude Haiku) → selects component per IA slot.
│   ├── token-resolver.js      # Resolves behavioral tokens + palette from mode-tokens.json.
│   └── content-generator.js   # LLM call (Claude Sonnet) → fills all slot values in one batch.
├── config/
│   ├── site.json              # Site declaration: pages, routes, variant dimensions, nav links.
│   ├── pages.json             # Page registry: routes + filenames written by site build.
│   └── routing.json           # Active build timestamp pointer. Written by Activate.
├── manifest/
│   ├── components.json        # 20+ components with beats, archetypes, funnel stages, variants, slots.
│   └── micro-blocks.json      # Primitive definitions.
├── tokens/
│   ├── mode-tokens.json       # Palette maps + behavioral tokens per preset + global accent.
│   ├── color-scale.json       # Color vocabulary: full Radix Colors (31 hues × 12 steps).
│   ├── theme.json             # Semantic assignment: maps palette tokens to color-scale entries.
│   └── variant-overrides.json # Named variant registry (slot visibility + layout per variant).
├── context/
│   ├── product-context.json   # Structured product facts injected into every build.
│   └── brand-brief.md         # Tone, pillars, claim territory injected as prompt fragment.
├── output/
│   ├── page-{ts}-{variant}.json   # Generated page outputs.
│   └── site-{ts}.json             # Site manifest linking all variants from a build.
└── ui/                        # Next.js 16 dashboard + preview.
    ├── app/
    │   ├── admin/build/       # Build tab — per-page build form + Site Build card.
    │   └── api/generate/site/ # POST endpoint for coordinated site builds.
    ├── components/
    │   ├── modules/           # One file per manifest component.
    │   └── blocks/            # Micro-block primitives.
    └── lib/
        ├── types.ts           # Schema contract between agent output and UI.
        └── get-output.ts      # File reads: output, manifests, page registry, site config.
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

### Narrative beats (built)

The IA planner structures every page around a 7-beat taxonomy. Each section is assigned one beat; the beat sequence is the narrative spine of the page.

| Beat | Job |
|---|---|
| Orientation | Establishes what page this is |
| Credibility | Proof that the claim is real |
| Value | What you actually get |
| Evidence | Specific, sourced substantiation |
| Decision | The commitment moment |
| Conversion | The close |
| Recovery | Last chance before they leave |

Funnel stage controls which beats appear and in what order. Awareness pages lead with Orientation and Value; conversion pages strip to Orientation and Conversion. Recovery is present only at decision stage and later.

Archetype drives behavioral tokens within each beat — copy density, evidence level, CTA rules. A Validator at the Evidence beat gets sourced stats and testimonials; a Mover gets a single credibility signal and moves on.

### Page zones (longer horizon — not yet built)

Zones are a planned structural layer *above* beats. A zone groups multiple related sections under one narrative purpose. The current flat section list is a simplification — beats already capture the right taxonomy, but zones would make multi-section groupings trackable and governable.

```
Page → Zones → Sections (each with a beat) → Components → Micro-blocks
```

When this gets tackled: the IA planner generates a zone map first, then fills sections per zone. `manifest/components.json` gains zone affinity per component. Output JSON carries zone labels. The current architecture is compatible — just not zone-aware yet.

---

## Two build modes — and why they stay separate

The admin Build tab has two distinct paths. It matters to understand them as separate paradigms, not variations of the same thing.

### Site Build (funnel methodology)

Triggered by the **Site Build card** at the top of the Build tab. Reads `config/site.json` and generates all pages and variants in one coordinated run.

- Routing dimension: **funnel stage** (awareness → consideration → decision → conversion)
- Pages: Homepage (4 variants) + Pricing (1 variant) = 5 outputs per build
- Nav links injected into every NavigationHeader from `site.json`
- `config/pages.json` updated with explicit filenames — `/pricing` reads its file directly and survives subsequent archetype builds without breaking
- Activate: writes `config/routing.json` with the site build's timestamp; homepage routes by detected funnel stage

The funnel site build is the primary deployment path. The visitor's position in the funnel determines which homepage variant they see. `/pricing` is always the conversion-stage page regardless of which variant the homepage is serving.

### Per-page Build (archetype methodology)

Triggered by the **brief form** below the Site Build card. Generates N variants of a single page using whichever preset is selected.

- Funnel-driven: 4 variants keyed by funnel stage (same dimension as site build, but for one page only)
- Archetype-driven: 3 variants keyed by archetype (Mover, Validator, Explorer)
- Feature-emphasis: 4 variants, editorial intent drives palette instead of funnel stage

Archetype mode is a **different routing paradigm** — the visitor's identity type (not funnel position) determines which variant they see. This affects everything: variant labels, the routing signal in `proxy.ts`, and the structure of the site manifest. Archetype builds are valid and produce good output. They just don't compose with the funnel site structure.

**The current boundary:** archetype-mode site building (generating a multi-page site where archetype is the routing dimension) is deferred until the funnel site build flow is fully locked. The two paradigms need to be validated separately before a unified config tries to express both.

---

## Current state

### Done (as of June 2026)

- **Agent pipeline** — brief → IA proposal → human approval → component selection → token resolution → content generation → JSON output. Four-step, three LLM models.
- **Multi-variant builds** — one run produces N variant files (4 for funnel-driven, 3 for archetype-driven). Site manifest links them. `/admin/site` renders all with linked nav.
- **Site build** — `config/site.json` declares all pages (routes, variant dimensions, nav links). `agent/site-builder.js` orchestrates a full site in one run: all page × variant combos in parallel, nav links injected into every NavigationHeader, output files written, `config/pages.json` updated with explicit filenames for single-variant pages. Site Build card in the admin Build tab triggers via `POST /api/generate/site`.
- **Pricing page stability** — `/pricing` now reads its output file directly from the filename written into `config/pages.json` by the site build, bypassing the active build's variant set entirely. A subsequent archetype build can be activated without breaking `/pricing`. Falls back to `findVariantFile("conversion")` if no explicit filename is set (pre-site-build behavior).
- **Three palette presets** — funnel-driven, feature-emphasis, archetype-driven. Selectable per build in the Build form without config file edits.
- **CSS variables layer** — `color-scale.json` (vocabulary) + `theme.json` (semantic assignment via dot-notation). Resolves at request time, no rebuild needed.
- **Slot editor** — Edit tab with per-section field editing, CTA (label + href) support, named links panel.
- **Beat visibility in Edit tab** — left panel groups sections under beat headers (Orientation, Credibility, Value, etc.) with visual dividers. Right panel shows the beat label above the slot editor for the selected section. Makes the narrative taxonomy visible during editing.
- **Add section in Edit tab** — after a build, insert a new content row into the IA without rebuilding. "Add section" button at the bottom of the left panel opens a picker: choose a beat, then a component (filtered by beat affinity from the manifest), then a variant and palette. Two actions: "Add blank" (empty slots, edit manually) or "Generate & add" (calls `POST /api/generate/section` with the page's existing brief and IA as context, populates slots automatically). Saves via `PUT /api/output/save` `action: "append"` (inserts before the footer). Local state updates immediately; disk write persists on reload.
- **Edit/Studio source sync** — Edit tab default view now reads from the active build's manifest (same source as Studio) rather than the latest site manifest by mtime. Ensures sections added in Edit appear in Studio after reload. Previously these could point to different builds if a new build had been run but not activated.
- **Decision stage IA improvements** — Value beat added to the decision-stage beat sequence (between Credibility and Evidence), giving the IA a feature/value slot before the pricing signal. Component selector updated to prefer the `with-price` hero variant at decision stage, anchoring the offer above the fold.
- **ContentSection and HeroStatement components** — two manifest-declared components that were never implemented are now built and registered. `ContentSection`: long-form body content for Validator/Explorer pages; `standard`, `with-sidebar`, and `with-callout` variants. `HeroStatement`: text-heavy opening with no media distraction; `centered`, `left-aligned`, and `with-eyebrow` variants. Both are now selectable in the add-section picker and available to the agent.
- **Studio** — full-screen canvas at `/admin/studio`. Birds-eye view (all variants at scale) + expanded view (1:1 scrollable). Live palette token remapping via color picker (constrained to `color-scale.json` vocabulary). Component swapper with IA candidate chips. Variant row for manifest variant swap. Design System mode for editing `color-scale.json` directly.
- **Named variant registry** — `tokens/variant-overrides.json`. SlotEditor in Studio creates named variants (slot visibility masks + layout). Any section can reference a named variant via `custom_variant`. Applied at render time in both `/admin/preview` and `localhost:3000`.
- **Runtime signal routing** — `proxy.ts` detects UTM, cookies, UA → archetype and funnel stage headers. `config/routing.json` points to the active build. Homepage serves the right variant. Query params override for testing (`?archetype=Mover`, `?funnel_stage=decision`).
- **Brand context** — `context/product-context.json` + `context/brand-brief.md`. Brand tab has URL extractor + editors. Injected into every build.
- **Deploy panel** — Run tab commits `output/` + `config/` and pushes to trigger Vercel build (content-lane separate from code-lane).
- **Integration guide** — `docs/integration-guide.md` documents the three adoption levels and buyer integration contract.

### Up next

| Item | Notes |
|------|-------|
| **Lock funnel-mode site building** | Validate the end-to-end site build → activate → deploy flow using funnel methodology. Confirm routing, `/pricing` stability, and nav injection across a full Vercel deployment before expanding further. |
| Archetype-mode site building | **Deferred until funnel-mode site building is locked.** Archetype mode uses a different routing paradigm (3 variants: Mover/Validator/Explorer) and a different variant dimension — it doesn't map cleanly onto the funnel site structure. The two modes need to be validated and understood as separate before a unified site config tries to handle both. |
| External design system integration | Document the component registration contract for buyers with existing component libraries. Variant swapping is the universal primitive; slot visibility is MODE-first-party only. |
| Dashboard cookie threshold control | `STAGE_ADVANCE_THRESHOLD` is currently hardcoded in `ui/proxy.ts`. Should be configurable from the dashboard without a code edit. |
| Page zones (longer horizon) | IA planner generates zone map first, then section fill per zone. Funnel stage controls zone weight; archetype controls density within zones. Requires manifest zone affinity per component. |
| CMS as revision layer | After content schema is stable. LLM authors → CMS is the human exception-handling surface. Payload or Sanity. |
| Product catalog (`config/products.json`) | Current checkout setup in `product-context.json` is a single-product structure (`checkout.primary_url`, one pricing tier block). Multi-product or multi-SKU scenarios need a catalog — a manifest of products each with their own checkout URL, named link token, pricing, and tier config. The content generator and slot editor would resolve against the catalog instead of the flat `checkout` block. Same pattern as `config/pages.json`. Not needed until there's more than one product to sell. |

---

## Decision stage IA — design notes

The decision stage is the last page a visitor sees before they go to `/pricing`. Its job is different from awareness or consideration: the visitor is already informed, they're evaluating whether to commit. The IA should reflect that.

**What the current decision stage IA generates:**
1. Navigation (minimal) → Hero (text-only, "Your trial worked. Here's what you're keeping.")
2. TestimonialSingle (credibility)
3. StatBlock (proof points)
4. PricingCard (pricing signal)
5. CTABanner (commitment CTA)
6. Footer

**What's missing:**

**A feature/value block.** The jump from proof (testimonial + stats) directly to a pricing card skips the "here's what you get" moment. A FeatureGrid or equivalent should appear between the credibility beat and the pricing beat — not as an awareness-style feature showcase, but with direct language framed as confirmation: "Here's what's in the system you're evaluating." The copy register should be conclusive, not introductory.

**A pricing-aware hero variant.** The current hero is pure orientation text. At decision stage, surfacing the price in the hero itself — "MODE Kit — $1,199. One purchase, lifetime access." — removes a click and anchors the offer before anything else. This would be a new hero variant, not a general pattern. The IA planner would need to know this variant exists and select it when the funnel stage is `decision` and there's a price signal in the product context.

To implement this, add a `hero-with-price` variant to `HeroPrimary` in `manifest/components.json` with a `price_display` slot (string). Update the IA planner prompt to prefer this variant at decision stage when `product-context.json` has pricing data. The component renders the price as a secondary visual element below the headline — not as a CTA, as a fact.

**What to avoid:**

- Auto-redirect to checkout. The decision page should not skip the `/pricing` page — the pricing page has a specific job (conversion register, comparison, full proof) and bypassing it removes that. CTAs should link to `/pricing`, not to checkout directly.
- Recovery popups at the page level are a valid future concept (catch bouncing visitors before they leave), but these belong in a separate layer and should not be part of the IA output. They are client-side behavior, not semantic page structure.

**The current IA is not wrong — it's just incomplete.** Trust + proof + pricing is a valid decision-stage structure. Adding the feature block and the pricing hero variant makes it more specific to what the decision moment actually requires.

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
