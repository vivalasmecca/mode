# MODE — Page Builder Agent
## Claude Code Kickoff Document
**Project:** MODE / Hyve Digital (prior works — IP protected)**
**Build context:** Nights + weekends. Independent of LZ.

---

## What this project is

MODE is an intent-aware design system built as a semantic layer on top of Radix UI components, targeted at SaaS businesses. The page builder agent is the first working surface — it takes a brief, proposes an information architecture, then selects and populates components to build a semantic HTML page.

The agent exists. The UI dashboard is built and working. The current focus is on multi-variant generation and preview evaluation.

---

## Architecture: the three tiers

```
┌─────────────────────────────────────────┐
│  SEMANTIC INTENT LAYER                  │
│  Why this pattern exists.               │
│  What job it's doing.                   │
│  Which archetype it serves.             │
│  Funnel stage, context mode, tone.      │
├─────────────────────────────────────────┤
│  MODULE LAYER                           │
│  Named, trackable compositions.         │
│  Analytics and governance hooks here.   │
│  SEO/PMM operate at this layer.         │
├─────────────────────────────────────────┤
│  MICRO-BLOCK LAYER                      │
│  Reusable primitives.                   │
│  Headline/subhead lockups, card grids,  │
│  stat blocks, CTAs, etc.                │
│  Modules are built from these.          │
└─────────────────────────────────────────┘
```

**Key principle:** Micro-block granularity only works if the semantic layer maintains accountability. Without it, composition is invisible to analytics and deprecation becomes impossible. Both tiers are necessary.

---

## The four resolution dimensions

Every component resolves its UI behavior across these dimensions:

| Dimension | Scope | Description |
|-----------|-------|-------------|
| **Archetype** | User identity (stable) | Mover, Validator, Explorer |
| **Funnel Stage** | Page-level declaration | Awareness, consideration, decision, conversion |
| **Intent State** | Session-level register | Emotional mode of the current interaction |
| **Context Mode** | Environmental frame | Campaign, organic, retargeting, etc. |

Page-level sets the declaration (funnel stage + context mode + tone). This cascades down. Component-level overrides are available but exceptional.

### The three archetypes

- **Mover** — acts fast, low friction, high confidence. Minimal copy, strong CTA, no noise.
- **Validator** — needs reassurance, considered, trust-seeking. Social proof, specificity, space to think.
- **Explorer** — browsing, discovery mode, not ready to commit. Content-rich, low pressure, navigational.

**Important:** Archetype is a property of the *visitor*, not the palette. It is always declared and fixed for a given build — it drives behavioral tokens (copy density, evidence level, CTA rules) and IA shape. Archetype and palette driver are separate concepts.

*These archetypes predate this project and are core IP.*

---

## Palette drivers — how design tokens are remapped

The palette driver determines which runtime signal remaps the visual design tokens (dark / light / neutral) per section. Three are built, configured in `tokens/mode-tokens.json`:

| Preset | Palette driver | Variant dimension | Variants generated |
|--------|---------------|-------------------|--------------------|
| `funnel-driven` | funnel stage | `funnel_stage` | awareness, consideration, decision, conversion |
| `feature-emphasis` | editorial intent | `funnel_stage` | awareness, consideration, decision, conversion |
| `archetype-driven` | archetype | `archetype` | Mover, Validator, Explorer |

**`funnel-driven` is the most common and should be the default.** Archetype-driven is valid and important for the connection between visitor identity and visual expression, but used less frequently.

The active preset is set in `tokens/mode-tokens.json` → `"active_preset"` and determines the **default** selection in the Build form. The Build form lets the user switch presets per build — the selected preset is passed through the full pipeline without requiring a file edit or server restart. (`token-resolver.js` still caches `mode-tokens.json` at module load, but now accepts an optional preset override at call time so all presets can be used from a single server session.)

When archetype-driven is active: archetype drives *both* behavioral tokens (always) *and* the palette (via the active preset). This is the semantic connection between visitor identity and visual language.

---

## The page builder agent — what exists

The agent pipeline:

1. `ia-planner.js` — takes brief + manifest, proposes section-by-section IA (Claude Opus)
2. `component-selector.js` — selects specific component + variant for each IA slot (Claude Haiku)
3. `token-resolver.js` — resolves behavioral tokens and palette per component (no LLM, reads mode-tokens.json)
4. `content-generator.js` — populates all slots with real copy (Claude Sonnet)

Output is written to `output/page-{timestamp}-{variant}.json`. Multi-variant builds produce one file per variant.

---

## UI dashboard — current state (as of June 2026)

The dashboard is a Next.js 16 app in `ui/`. Start it with `npm run dev` from `ui/`.

```
http://localhost:3000/dashboard       ← Overview (latest output)
http://localhost:3000/dashboard/build ← Build form (multi-variant generation)
http://localhost:3000/preview         ← Latest output rendered
http://localhost:3000/preview?file=page-{ts}-{variant}.json ← Specific variant
```

### Dashboard tabs

- **Overview** — shows preset, brief, behavioral tokens, token resolution table, and IA rationale for the latest output file
- **Concepts** — static reference documentation for all brief fields and system concepts
- **Build** — the main UI for generating pages (see below)
- **Run** — (exists, purpose TBD)

### Build tab flow

1. Reads all presets from `/api/config` on mount; pre-selects the active preset from `mode-tokens.json`
2. **Palette Approach selector** — radio cards for each preset (name, description, palette driver, variants list). Switching preset updates the form below.
3. Brief fields: audience, goal, context_mode + the non-variant dimension (archetype or funnel stage, depending on selected preset)
4. Submits → selected preset + brief sent to `/api/generate/ia` → N IA proposals in parallel
5. IA review with tabs — one tab per variant, shows sections + rationale
6. "Approve & Generate All N" → full pipeline runs in parallel for each variant (preset passed to token resolver)
7. Output files saved, preview tabs opened automatically

### Key architecture decisions in the UI

**CJS agent modules from ESM Next.js routes:** The agent files (`mode/agent/*.js`) are CommonJS. They are installed as a local npm package (`"mode-agent": "file:../agent"` in `ui/package.json`) and listed in `serverExternalPackages` so Turbopack never tries to bundle them. Loaded at runtime via `createRequire`.

**`createRequire` anchoring:** Must be anchored to the project root, not `import.meta.url`:
```ts
const _require = createRequire(path.resolve(process.cwd(), "__route__"));
```
This ensures Node.js resolves `mode-agent/*` from `ui/node_modules/` regardless of where Turbopack places the compiled file.

**Turbopack root:** Set explicitly to `mode/ui/` in `next.config.ts` to prevent Turbopack from auto-detecting `mode/` as workspace root (which breaks Next.js module resolution). The warning about multiple lockfiles is expected and harmless once `turbopack.root` is set.

**Token resolver caching:** `token-resolver.js` caches `mode-tokens.json` at module load time (Node.js module cache). Changing the active preset requires restarting the dev server.

---

## File structure (current)

```
mode/
├── CLAUDE.md                        ← this file
├── manifest/
│   ├── components.json              ← component manifest v1
│   └── micro-blocks.json            ← primitive definitions
├── agent/
│   ├── package.json                 ← name: "mode-agent" (local npm package)
│   ├── page-builder.js              ← CLI orchestrator (not used by UI)
│   ├── ia-planner.js                ← IA proposal (Claude Opus)
│   ├── component-selector.js        ← component selection (Claude Haiku)
│   ├── token-resolver.js            ← palette + behavioral token resolution
│   ├── content-generator.js         ← slot population (Claude Sonnet)
│   └── set-preset.js                ← CLI tool to switch active preset
├── tokens/
│   └── mode-tokens.json             ← palette maps + behavioral tokens per preset
├── output/
│   └── page-{ts}-{variant}.json    ← generated page outputs (one per variant per run)
└── ui/                              ← Next.js 16 dashboard + preview
    ├── next.config.ts               ← turbopack.root + serverExternalPackages
    ├── package.json                 ← includes mode-agent as file: dependency
    ├── app/
    │   ├── dashboard/
    │   │   ├── layout.tsx           ← reads latest output, wraps all tabs
    │   │   ├── page.tsx             ← Overview tab
    │   │   ├── TabNav.tsx
    │   │   ├── build/
    │   │   │   ├── page.tsx
    │   │   │   └── BuildClient.tsx  ← "use client" — full build flow
    │   │   ├── concepts/page.tsx    ← static reference docs
    │   │   └── run/page.tsx
    │   ├── preview/page.tsx         ← renders output JSON; supports ?file= param
    │   └── api/
    │       ├── config/route.ts      ← GET: active preset + variant config
    │       └── generate/
    │           ├── ia/route.ts      ← POST: N IA proposals in parallel
    │           └── page/route.ts    ← POST: N full pages in parallel
    ├── components/
    │   ├── preview/
    │   │   ├── PreviewClient.tsx    ← renders page sections from output JSON
    │   │   └── SectionLabel.tsx     ← dev overlay
    │   ├── modules/                 ← one component per manifest entry
    │   │   └── index.ts             ← MODULE_REGISTRY
    │   └── blocks/                  ← micro-block primitives
    └── lib/
        ├── get-output.ts            ← getLatestOutput() + getOutputByFile(filename)
        ├── types.ts                 ← schema contract (PageOutput, PageBrief, etc.)
        └── palette.ts               ← getPalette() utility
```

---

## Picking up mid-build

When dropping back in after time away, start here:

1. **Start the dashboard:** `cd ui && npm run dev` → http://localhost:3000/dashboard
2. **Go to Build tab** → select a palette approach → fill in a brief → approve IAs → generate all variants → review previews in new tabs.
3. **Default preset:** `tokens/mode-tokens.json` → `"active_preset"` controls which preset is pre-selected in the Build form. The form lets you switch per build without touching the file.
4. **If you get a "Cannot find module 'mode-agent'" error:** run `npm install` from `ui/` to restore the symlink.
5. **If the dashboard throws a JSON parse error on load:** delete `.next/` and restart (`rm -rf .next && npm run dev`).

---

## What's working

- Full pipeline: brief → IA → component selection → token resolution → content generation
- Multi-variant generation: one build run produces N variant files (N = 4 for funnel-driven, 3 for archetype-driven)
- IA review with tabs before committing to generation
- Preview at `/preview?file={filename}` for any specific variant
- Dashboard overview shows latest output (behavioral tokens, IA rationale, token resolution table)
- **Palette Approach selector in the Build form** — all three presets selectable per build; no file editing or server restart required

---

## What's next (as of June 2026)

- **Visual mapping tool** — the open question: how does a designer configure token values per dimension? See "Unresolved" section below.
- **Runtime signal routing** — serving the right variant based on visitor signals (the end goal of the whole system)
- **Product data inputs** — see "Unresolved: product grounding" below.

---

## Architecture principle: semantic states vs. visual expression

MODE's three palette modes (light / neutral / dark) are **semantic states**, not visual designs:

- **light** — low emphasis, background, chrome
- **neutral** — supporting context, informational
- **dark** — high emphasis, spotlight moments

What those states *look like* is the consuming design system's responsibility. MODE declares intent ("this component should be high emphasis here"). The brand fills in what high emphasis means visually.

This has two important consequences:

**1. The visual mapping tool is not a design task**
Deciding that `HeroPrimary` should be `dark` for a Validator in decision stage is a judgment call about semantic weight — not a visual design problem. You're not designing 3 colorways per component. You're declaring once which weight a component should carry in each context.

**2. MODE is a framework, not a look**
Anyone should be able to adopt MODE by writing their own theme mapping. The architecture separates into two layers:

- **Intent layer (MODE owns)** — `mode-tokens.json`: which semantic state each component is in for each context. Shared across any deployment.
- **Expression layer (consuming system owns)** — what `light`, `neutral`, and `dark` resolve to in *their* token system (CSS variables, Tailwind config, component props, etc.).

A fourth planned preset or a new client deployment means writing a new intent map — not redesigning the visual system.

**On Figma as a design system connection point**

Figma holds visual tokens and component structure. It has no concept of semantic intent. An ingestion from Figma could tell MODE what components exist and what their visual variants are — but it cannot tell MODE which variant is appropriate for a Validator in decision stage. That part lives in MODE's config layer and always will.

The cleaner seam is a code-level integration: the user defines what `light`, `neutral`, and `dark` resolve to in their token system. MODE owns the intent mapping. The consuming system owns the visual expression. No sync dependency, no Figma sidecar.

**How palette approach and theme mapping differ**

These are different layers that currently both live in `mode-tokens.json`:

- **Palette approach (preset) = intent layer.** Answers: *which semantic state should this component be in for this context?* (`HeroPrimary` + `decision stage` → `dark`). This is the interesting/hard part — it encodes judgment about emphasis and hierarchy.
- **Theme mapping = expression layer.** Answers: *what does `dark` actually look like?* (`dark` → `bg-gray-900`, `text-white`, `border-gray-700`). Currently hardcoded in `palette_modes` in `mode-tokens.json`.

```
palette_map    → intent layer    (component + context → light/neutral/dark)
palette_modes  → expression layer (light/neutral/dark → actual CSS classes)
```

A brand adopting MODE would keep the preset logic (or write their own) and only replace `palette_modes` with their brand's token values — maybe `dark` means `bg-brand-navy` and `text-brand-cream` in their system.

The theme mapping isn't a new concept to build so much as a **named seam** that should be made explicit and easy to swap. The right move is probably a separate `theme.json` that lives outside `mode-tokens.json` — clearly the brand's responsibility, not the system's.

*The expression layer / theme mapping is not yet built as a separable artifact. It's the right next abstraction after the intent mapping tooling is in place.*

**Relationship to Radix Themes**

The Radix Themes playground already handles the expression layer at a global brand level — accent color, gray scale, radius, scaling — and outputs a code-native config with no sync problem. MODE's intent layer is orthogonal to this: it determines which semantic state each component gets and when. These compose naturally. A user configures their brand once in the Radix playground; MODE orchestrates which Radix appearance gets applied per component per context.

**What the visual mapping tool actually is**

Not a design tool — a **semantic decision tool with live component previews**. Instead of abstract color swatches in a grid, show the actual rendered Radix components in their three states (light / neutral / dark) so the designer can make intent decisions ("yes, this component should be dark here") while seeing real output. Code-native, no walled garden, lives in the dashboard. This is the "in-between" — more structured than Figma, more semantic than the Radix playground.

---

## Unresolved: MODE Studio (canvas / orchestration view)

A higher-level concept above the visual mapping tool. The idea: a studio-like experience that reads from your theme and lets you lightly orchestrate and envision changes across the full system — not one variant at a time, but all of them simultaneously on a single canvas.

**The interaction model** is similar to how Claude's design output works: a series of samples rendered on one surface. You can see all variants at once and zoom out to compare, or click into a single artifact to inspect it. For MODE this would mean:

- All generated page variants visible on one canvas
- Pinch-zoom to compare across variants or drill into one
- Theme token controls alongside the canvas — adjust a token value and all variants update live
- Possibly semantic controls too — shift a component's weight for a given context and see the ripple

**Why this matters:** Right now evaluation happens by opening separate preview tabs and mentally comparing. A canvas view would make differentiation visible at a glance — you'd immediately see whether the funnel stages or archetypes are producing meaningfully different experiences, or whether they're converging.

**Relationship to other layers:**
- Reads from the expression layer (theme tokens → visual output)
- Reads from the intent layer (preset palette maps → which semantic state per component)
- Doesn't replace either tool — it's the evaluation and envisioning surface above both

*This is a longer-horizon concept. Define the expression layer and visual mapping tool first, then the studio becomes the thing that makes both of them legible.*

---

## Unresolved: visual mapping tool

The hard architectural question is the handoff between discovery and build:

- **Discovery mode** — visual, tactile. Designer defines what "Validator in decision stage" *feels* like. Color temperature, type weight, spatial density. Impressionistic.
- **Build mode** — structured, token-mapped, exportable. Those impressions translated into actual token values the resolution engine consumes.

The gap: how does a designer set token values per dimension, and does the system compose them (per dimension × dimension = token value) or assign them per mode (Validator-in-decision is a single named profile)?

### Breakdown

**Step 1: Settle the model ✓ resolved**

Worked through three examples to answer: does knowing both dimensions simultaneously change the palette, or is one dimension enough?

- **Validator + decision** — both dimensions point the same way (heavy, dark, authoritative). No tension.
- **Mover + awareness** — tension: awareness says light, Mover says give me one clear action. Resolution: light overall, one dark CTA punch.
- **Mover + decision vs. Mover + awareness** — these differ, but the funnel stage is doing all the palette work. The Mover archetype shows up in what's *present* (fewer sections, less social proof) and how copy reads — not in whether the hero is dark or light.

**Conclusion: single-dimension palette presets are sufficient.** The behavioral tokens already handle archetype differences (copy density, evidence level, CTA rules). The palette expresses the emotional register of the moment (funnel stage) or identity (archetype) — cross-dimension composition would produce mostly the same values as the 1D map.

The visual mapping tool is a **1D grid** — components on rows, dimension values on columns — not a 2D matrix.

**Step 2: Build a read-only palette map visualizer**

A new dashboard tab (or panel) that renders the current preset's `palette_map` as a visual grid — components on rows, dimension values on columns, cells color-coded light/neutral/dark. Right now the designer reads raw JSON. This makes it visible.

**Step 3: Make the grid editable**

Click a cell → cycle through light / neutral / dark. Visual feedback in place.

**Step 4: Wire saving**

API route that accepts the updated `palette_map` and writes it back to `mode-tokens.json`. Token resolver caches at module load, so a server restart is needed to use the new values in a build — acceptable constraint for now, worth noting in the UI.

**Step 5: (Future) Cross-dimension composition**

Only if Step 1 resolves to "we need both dimensions active at once" — extend the schema and resolver to handle a 2D matrix instead of 1D maps.

---

## Unresolved: product grounding

The current system generates content entirely from the brief (audience, goal, archetype, funnel stage, context mode). The LLM invents product claims, features, stats, and copy with no grounding in actual product truth. This is fine for demo and system evaluation, but a real deployment needs real data flowing in.

**The two connection points:**

**1. Product catalog / feature set**
What the product actually does, what features exist, real pricing, real metrics and social proof. Currently absent — the content generator fabricates all of this.
- Feeds into: `content-generator.js` prompt (slot population)
- Possibly also: `ia-planner.js` (IA structure might reflect what the product actually has)
- Format TBD: could be a JSON catalog, markdown feature brief, or structured schema

**2. Brand brief / messaging guide**
Tone of voice, messaging pillars, what claims are approved, what language is off-brand, positioning relative to competitors. Also absent.
- Feeds into: `content-generator.js` prompt (copy style and claim boundaries)
- Possibly: `ia-planner.js` (IA ordering might reflect brand narrative priorities)
- Format TBD: likely a text document or structured prompt fragment

**Current state:** The brief is the only input. The system is architecturally sound; the content is hallucinated product truth. For demos this is acceptable. For any real client deployment, both connection points need to be wired.

*Come back to this when the system is being positioned for a real client or when the visual mapping tool question is resolved — both are likely to inform the data model here.*

---

## What MODE is for

Every SaaS product has the same problem: a design system that knows how to render components but not *why* to render them. MODE adds the semantic layer — components that know which user they're talking to, where that user is in the funnel, and what emotional register the moment requires. The result is a design system that makes better decisions by default, reduces the QA burden on every page, and gives non-designers a structured way to build without breaking brand.

*Built under Hyve Digital. Prior works IP claim on file.*
