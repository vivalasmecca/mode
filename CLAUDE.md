# MODE — Page Builder Agent
## Claude Code Kickoff Document
**Project:** MODE / Hyve Digital (prior works — IP protected)**
**Build context:** Nights + weekends. Independent of LZ.

---

## What this project is

MODE is an intent-aware design system built as a semantic layer on top of Radix UI components, targeted at SaaS businesses. The page builder agent is the first working surface — it takes a brief, proposes an information architecture, then selects and populates components to build a semantic HTML page.

The agent exists. The UI dashboard is built and working. The current focus is on multi-page coherence — demonstrating that the semantic thread holds across a full funnel journey, not just within one page.

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
| `expression-dial` *(planned)* | none — flat palette | `funnel_stage` | awareness, consideration, decision, conversion |

**`funnel-driven` is the most common and should be the default.** The planned `expression-dial` preset is a simpler usage mode: palette is flat (no color shifts), and funnel stage drives layout expressiveness and copy register only. See "Two usage modes" below. Archetype-driven is valid and important for the connection between visitor identity and visual expression, but used less frequently.

The active preset is set in `tokens/mode-tokens.json` → `"active_preset"` and determines the **default** selection in the Build form. The Build form lets the user switch presets per build — the selected preset is passed through the full pipeline without requiring a file edit or server restart. (`token-resolver.js` still caches `mode-tokens.json` at module load, but now accepts an optional preset override at call time so all presets can be used from a single server session.)

When archetype-driven is active: archetype drives *both* behavioral tokens (always) *and* the palette (via the active preset). This is the semantic connection between visitor identity and visual language.

---

## The page builder agent — what exists

The agent pipeline:

1. `ia-planner.js` — takes brief + manifest, proposes section-by-section IA (Claude Opus)
2. `component-selector.js` — selects specific component + variant for each IA slot (Claude Haiku)
3. `token-resolver.js` — resolves behavioral tokens, palette, and accent per component (no LLM, reads mode-tokens.json)
4. `content-generator.js` — populates all slots with real copy (Claude Sonnet)

Output is written to `output/page-{timestamp}-{variant}.json`. Multi-variant builds produce one file per variant.

---

## UI dashboard — current state (as of June 2026)

The dashboard is a Next.js 16 app in `ui/`. Start it with `npm run dev` from `ui/`.

```
http://localhost:3000/admin                                    ← Overview (latest output)
http://localhost:3000/admin/build                              ← Build form (multi-variant generation)
http://localhost:3000/admin/preview                            ← Latest output rendered
http://localhost:3000/admin/preview?file=page-{ts}-{variant}.json ← Specific variant
http://localhost:3000/admin/site?ts={ts}                       ← Site view: all variants from a build with linked nav
http://localhost:3000/admin/site?ts={ts}&page={label}          ← Specific page within a site build
```

All admin routes are local-only. On Vercel they return 403 unless `ADMIN_KEY` is set.

### Dashboard tabs

- **Overview** — shows preset, brief, behavioral tokens, token resolution table, and IA rationale for the latest output file
- **Concepts** — static reference documentation for all brief fields and system concepts
- **Build** — the main UI for generating pages (see below)
- **Brand** — extract product context from URLs, edit brand brief; both feed every build
- **Palette** — editable palette map grid + brand accent configuration (see below)
- **Run** — (exists, purpose TBD)

### Build tab flow

1. Reads all presets from `/api/config` on mount; pre-selects the active preset from `mode-tokens.json`
2. **Palette Approach selector** — radio cards for each preset (name, description, palette driver, variants list). Switching preset updates the form below.
3. Brief fields: audience, goal, context_mode + the non-variant dimension (archetype or funnel stage, depending on selected preset)
4. Submits → selected preset + brief sent to `/api/generate/ia` → N IA proposals in parallel
5. IA review with tabs — one tab per variant, shows sections + rationale
6. "Approve & Generate All N" → full pipeline runs in parallel for each variant (preset passed to token resolver)
7. Output files saved + `site-{ts}.json` manifest written → one `/admin/site?ts=` tab opens with all pages linked in the nav bar

### Key architecture decisions in the UI

**CJS agent modules from ESM Next.js routes:** The agent files (`mode/agent/*.js`) are CommonJS. They are installed as a local npm package (`"mode-agent": "file:../agent"` in `ui/package.json`) and listed in `serverExternalPackages` so Turbopack never tries to bundle them. Loaded at runtime via `createRequire`.

**`createRequire` anchoring:** Must be anchored to the project root, not `import.meta.url`:
```ts
const _require = createRequire(path.resolve(process.cwd(), "__route__"));
```
This ensures Node.js resolves `mode-agent/*` from `ui/node_modules/` regardless of where Turbopack places the compiled file.

**Turbopack root:** Set explicitly to `mode/ui/` in `next.config.ts` to prevent Turbopack from auto-detecting `mode/` as workspace root (which breaks Next.js module resolution). The warning about multiple lockfiles is expected and harmless once `turbopack.root` is set.

**Token resolver caching:** `token-resolver.js` caches `mode-tokens.json` at module load time (Node.js module cache). Editing palette maps or accent tokens via the Palette tab writes to the file immediately, but a dev server restart is needed for those changes to take effect in new builds. The UI notes this after saving.

**Palette tab:** Two sections — Brand Accent (global, not per-preset) and Palette Map (per-preset grid). Accent has `on_light` and `on_dark` variants for branded CTA buttons. Palette map cells cycle light → neutral → dark on click. Both have independent save states; saves write directly to `mode-tokens.json`.

**Site manifest:** After each multi-variant build, `/api/generate/page` writes `output/site-{ts}.json` recording all variant files, preset, and base brief. The `/admin/site` route reads this to power the linked nav bar — no database, just the same flat-file pattern as the page outputs.

**Brand context:** `context/product-context.json` and `context/brand-brief.md` are read by `content-generator.js` on every build — no restart required. If `product_name` is empty, the files are ignored and the generator falls back to hallucinating product truth. If `checkout.primary_url` is set, CTA `href` values in generated pages point to the real checkout URL instead of `#`.

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
│   ├── content-generator.js         ← slot population; reads context/ files at build time
│   ├── brand-context-builder.js     ← ingestion agent: URLs → product-context + brand-brief
│   └── set-preset.js                ← CLI tool to switch active preset
├── tokens/
│   └── mode-tokens.json             ← palette maps + behavioral tokens per preset + global accent
├── context/
│   ├── product-context.json         ← structured product facts (name, features, pricing, checkout URL)
│   └── brand-brief.md               ← tone, messaging pillars, claim territory (markdown)
├── output/
│   ├── page-{ts}-{variant}.json    ← generated page outputs (one per variant per run)
│   └── site-{ts}.json              ← site manifest (all variants for a build, written after generation)
└── ui/                              ← Next.js 16 dashboard + preview
    ├── next.config.ts               ← turbopack.root + serverExternalPackages
    ├── package.json                 ← includes mode-agent as file: dependency
    ├── proxy.ts                     ← signal detection + /admin block (local-only admin routes)
    ├── app/
    │   ├── robots.ts                ← disallows /admin/ and /api/ for crawlers
    │   ├── admin/                   ← all utility routes (local-only; 403 on Vercel)
    │   │   ├── layout.tsx           ← reads latest output, wraps all tabs
    │   │   ├── page.tsx             ← Overview tab
    │   │   ├── TabNav.tsx
    │   │   ├── build/
    │   │   │   ├── page.tsx
    │   │   │   └── BuildClient.tsx  ← "use client" — full build flow + Deploy button
    │   │   ├── concepts/page.tsx    ← static reference docs
    │   │   ├── palette/
    │   │   │   ├── page.tsx         ← server: reads mode-tokens.json, passes to client
    │   │   │   └── PaletteClient.tsx ← "use client" — accent + palette map editor
    │   │   ├── brand/
    │   │   │   ├── page.tsx         ← server: reads context/ files, passes to client
    │   │   │   └── BrandClient.tsx  ← "use client" — URL extractor, JSON + markdown editors
    │   │   ├── run/page.tsx
    │   │   ├── preview/page.tsx     ← renders output JSON; supports ?file= param
    │   │   └── site/page.tsx        ← site view: fixed dark nav + PreviewClient; reads site manifest
    │   └── api/
    │       ├── config/route.ts      ← GET: active preset + variant config
    │       ├── admin/
    │       │   └── deploy/route.ts  ← POST: commit output/ + config/, push to trigger Vercel deploy
    │       ├── palette/
    │       │   ├── route.ts         ← PUT: save palette_map for a preset
    │       │   └── accent/route.ts  ← PUT: save accent tokens
    │       ├── brand/
    │       │   ├── ingest/route.ts  ← POST: fetch URLs → extract product context + draft brand brief
    │       │   └── save/route.ts    ← PUT: write product-context.json and/or brand-brief.md
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
        ├── get-output.ts            ← getLatestOutput() + getOutputByFile(filename) + getSiteManifest(ts)
        ├── types.ts                 ← schema contract (PageOutput, PageBrief, etc.)
        └── palette.ts               ← getPalette() utility
```

---

## Picking up mid-build

When dropping back in after time away, start here:

1. **Start the dashboard:** `cd ui && npm run dev` → http://localhost:3000/admin
2. **Go to Build tab** → select a palette approach → fill in a brief → approve IAs → generate all variants → site view opens automatically with linked page navigation.
3. **Default preset:** `tokens/mode-tokens.json` → `"active_preset"` controls which preset is pre-selected in the Build form. The form lets you switch per build without touching the file.
4. **If you get a "Cannot find module 'mode-agent'" error:** run `npm install` from `ui/` to restore the symlink.
5. **If the dashboard throws a JSON parse error on load:** delete `.next/` and restart (`rm -rf .next && npm run dev`).

---

## What's working

- Full pipeline: brief → IA → component selection → token resolution → content generation
- Multi-variant generation: one build run produces N variant files (N = 4 for funnel-driven, 3 for archetype-driven)
- IA review with tabs before committing to generation
- Preview at `/admin/preview?file={filename}` for any specific variant
- Dashboard overview shows latest output (behavioral tokens, IA rationale, token resolution table)
- **Palette Approach selector in the Build form** — all three presets selectable per build; no file editing or server restart required
- **Palette tab** — editable palette map grid (click cells to cycle light/neutral/dark, save to `mode-tokens.json`) and brand accent editor (on_light / on_dark CTA color variants with live preview)
- **Accent layer** — `accent` block in `mode-tokens.json`; `token-resolver.js` exposes `accent` + `resolveAccent(paletteMode)`; `accent_tokens` written into output JSON per build
- **Multi-page site view** — after generation, a `site-{ts}.json` manifest is written; `/admin/site?ts=&page=` renders any page from the build with a fixed dark nav bar linking all variants; BuildClient opens one site tab instead of N preview tabs
- **Brand context agent** — `brand-context-builder.js` fetches URLs and uses Claude to extract `product-context.json` and draft `brand-brief.md`; both are injected into every build; CTAs use `checkout.primary_url` when set
- **MODE product brief populated** — `context/product-context.json` has the real product one-liner, 10 features, two pricing tiers (MODE Kit $1199 one-time, MODE Studio TBD), and differentiators; checkout URL pending LemonSqueezy setup

---

## What's next (as of June 2026)

- **LemonSqueezy setup** — add `checkout.primary_url` to `context/product-context.json` once the product is configured; CTAs in generated pages will link to the real checkout automatically.
- **Brand brief** — write `context/brand-brief.md` content (tone, pillars, claim territory); the Brand Setup tab has a markdown editor. This immediately improves copy register in builds.
- **Run the four-page Validator journey** — the site view and product context are both ready; now run four builds (awareness → consideration → decision → conversion) with the MODE product brief. The pages will be navigable via the site nav and copy will be grounded. This is the demo.
- **Mover contrast build** — run the same four funnel stages with Mover archetype. This is the demo moment.
- **Runtime signal routing** — serving the right variant based on visitor signals. See "Unresolved: runtime signal routing" below.

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

**Accent layer (built)**

Brand primary CTA color sits outside the semantic palette — it cuts across all three modes rather than being tied to section emphasis. Modeled as an `accent` block in `mode-tokens.json` with `on_light` and `on_dark` variants. Editable in the Palette tab. Flows into output JSON and is available to the renderer per section based on that section's palette mode.

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

## Unresolved: expression intensity layer

### The insight
Funnel stage currently drives palette mode (light/neutral/dark) and behavioral tokens (copy density, evidence level, CTA rules). It does not yet drive brand expression intensity — how much visual personality, editorial risk, and layout variant a page carries at different funnel stages.

At awareness, expression should be high: editorial hero layouts, full-bleed brand moments, breathing room. The brand earns attention here.

At conversion, expression should be minimal: get out of the way, clean and direct, no visual competition with the action.

This is the musicality principle — knowing when to be loud and when to be quiet.

### Narrower scope than it sounds
Expression intensity does not need to be a system-wide token applied to every component. Most components — stat blocks, pricing cards, testimonials, nav, footer — are utility sections where expressiveness doesn't apply.

The dial only matters for a small set of layout-expressive components:
- Hero sections (editorial vs. centered vs. split variants)
- Possibly a full-bleed statement or brand moment section
- Possibly a feature section with an editorial layout option alongside the grid option

The practical implementation is: add expressive variant options to 2–3 components in the manifest, and let the component selector use funnel stage to choose between them. No new token required — variant selection logic already exists and funnel stage is already available at selection time.

### When to build this
The funnel-stage demo is complete. The next step is to look at the awareness-stage pages and identify where the gap is visible — that's the right moment to add expressive variants to the specific components that need them.

---

## Two usage modes: semantic palette vs. expression dial

These are distinct value propositions that emerged from thinking about expression intensity. Both are valid; they target different buyers.

### Mode A — Semantic palette (what MODE is now)
The palette shifts across funnel stages. Color weight, behavioral tokens, and copy register all change. Dark sections at high-emphasis moments; light sections at low-emphasis moments. The visual system is doing intentional semantic work.

This requires the site owner to understand the intent layer — why this section is dark, why that one is light. The buyer is purchasing the methodology.

### Mode B — Expression dial (a potential future preset)
Palette is flat — no color shifts across funnel stages. The brand stays visually stable. What changes is the *energy* of the page: layout expressiveness, component variant selection, and copy register dial up at awareness and down at conversion. Colors don't move; personality does.

Simpler mental model. "Your hero at awareness is full-bleed and editorial. At conversion it's stripped and focused. The copy shifts. The colors don't." No explanation of palette modes required.

### Relationship to the current architecture
Mode B is a preset configuration, not a new system. It would be a flat palette map (all sections light, or all sections brand) combined with funnel-stage-aware variant selection. The component selector and content generator already have everything needed — the palette map is just zeroed out.

This would be a fourth preset type alongside `funnel-driven`, `feature-emphasis`, and `archetype-driven`.

### When to build this
Not now. The insight is worth preserving because it clarifies the addressable market. Mode A buyers want semantic control. Mode B buyers want better pages with a simpler interface. These are different products sharing the same underlying engine. Build Mode A fully first; Mode B follows naturally once the variant selection logic is mature.

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

**Step 2: Build a read-only palette map visualizer ✓ done**

Palette tab at `/admin/palette` — components on rows, dimension values on columns, cells color-coded light/neutral/dark. Three preset tabs to compare all maps.

**Step 3: Make the grid editable ✓ done**

Click any cell to cycle light → neutral → dark. Changed cells highlighted with an indigo ring. Discard to revert.

**Step 4: Wire saving ✓ done**

`PUT /api/palette` writes the updated `palette_map` for the selected preset back to `mode-tokens.json`. `PUT /api/palette/accent` saves the accent block. Both routes only touch their specific keys — nothing else in the file is affected. Server restart needed to pick up changes in builds; noted in the UI after saving.

**Step 4b: Accent layer ✓ done**

Added `accent` block to `mode-tokens.json` — global, not per-preset. Two variants: `on_light` (brand CTA on light/neutral sections) and `on_dark` (brand CTA on dark sections). Editable via the Palette tab with live preview. Flows into output JSON as `accent_tokens`; `token-resolver.js` exposes `resolveAccent(paletteMode)` for per-section resolution.

**Step 5: (Future) Cross-dimension composition**

Resolved as unnecessary — single-dimension presets are sufficient. See Step 1 above.

---

## Unresolved: runtime signal routing

The system generates N variant files at build time. Routing means: when a real visitor lands, something reads their signals and serves the right variant — without them knowing there are variants, without them choosing.

**Signals available at request time**

Easy (readable from the request itself):
- UTM params / referral source → maps naturally to `context_mode` (campaign, retargeting, organic)
- Query param override → useful for testing (`?variant=decision`)
- User agent / device → weak archetype proxy (mobile skews Mover)
- Cookie from a previous session → funnel stage advancement (return visitor = further along)

Hard (need external data):
- Actual archetype — who this person is behaviorally. Without a CDP or CRM, you're inferring from weak proxies.
- Funnel stage for a returning logged-in user — needs session history, which means integrating with whatever the product uses for user state.

**Where routing logic lives**

The cleanest option for the current architecture is **edge middleware** (Vercel Edge Middleware runs before the page loads, reads signals, rewrites to `/admin/preview?file=page-{ts}-{variant}.json`). No client-side flash, no server round-trip, works with the static JSON output files as-is. The routing logic itself is a lookup table: detected signals → variant label → filename.

**What's genuinely tricky**

1. **Archetype assignment without identity** — inferring Mover/Validator/Explorer from anonymous signals is lossy. You're making a population-level guess, not a person-level one. Fine for the system, but the accuracy ceiling is low without real identity data.
2. **Variant file currency** — the routing layer needs to know which build's files to serve (latest? pinned? per-campaign?). The timestamp in the filename means you need a pointer to the current active build.
3. **Intra-session funnel advancement** — a visitor lands in awareness but browses for 10 minutes. Do they get a different variant mid-session? Probably not for now, but architecturally that's the real-time routing end state.
4. **Analytics attribution** — if you're serving different variants, analytics needs to record which one was served. Otherwise you can't evaluate whether routing is working. This means firing an event (variant label, signals used, preset) on every page load.

**Interoperability — enhancements, not requirements**

Minimum viable routing has zero external dependencies: edge middleware + UTM/cookie signals + query param override for testing. That's shippable.

Enhancement layers where existing systems plug in:
- **CDP** (Segment, mParticle) → feeds real behavioral archetype signals
- **CRM** (HubSpot, Salesforce) → logged-in user identity → known archetype
- **A/B testing platforms** (Optimizely, Split) → statistical rigor on variant performance. Note: paradigm mismatch — these tools swap a headline; MODE swaps the entire IA, copy register, and palette. Usable as a routing decision layer only.
- **Analytics** (GA4, Amplitude) → variant label as a dimension on all events

**Breakdown**

1. Define signal → variant mapping rules (product/strategy decision — do this first)
2. Build edge middleware with UTM/cookie signal detection and variant file lookup
3. Add a "current build" pointer so routing always finds the right files
4. Instrument analytics (variant served as a page-level dimension)
5. (Enhancement) CDP/CRM integration for identity-based archetype assignment

---

## Product grounding — brand context agent

The product grounding layer is built. `context/product-context.json` and `context/brand-brief.md` are injected into every build by `content-generator.js`. The MODE product context is populated with a real one-liner, 10 features, two pricing tiers, and differentiators. The brand brief is still a template — needs content.

The original problem: the system generated content entirely from the brief, inventing product claims with no grounding in actual product truth. That's now resolved for MODE itself. For other deployments, the Brand Setup tab handles extraction from URLs.

**Two separate concerns**

These are distinct in ownership and cadence and should be treated as separate artifacts:

**Product context** — factual, semi-stable, product-owned
- What the product actually does
- Real features, real pricing, real metrics
- Customer proof (logos, testimonials, case study stats)
- Competitor positioning

**Brand brief** — editorial, stable, PMM-owned
- Tone of voice and approved language
- Messaging pillars (the 3–4 things the brand always returns to)
- Claim territory — what's approved, what's off-limits
- Positioning statement

**Architecture: a separate ingestion agent**

Ingestion is a different concern than generation — it runs on a different cadence (once per client setup, not per build) and pulls from different sources. The separation is clean:

```
ingestion agent → context/product-context.json + context/brand-brief.md
                                    ↓
                       content-generator.js (reads both at slot population time)
```

The ingestion agent takes source URLs or uploaded docs, crawls/reads them, and uses an LLM to extract and normalize into a structured format. The content generator doesn't know or care where the data came from.

**`product-context.json` schema (minimum viable)**

```json
{
  "product_name": "...",
  "one_liner": "...",
  "features": [{ "name": "...", "description": "...", "benefit": "..." }],
  "proof_points": [{ "value": "...", "label": "...", "source": "..." }],
  "pricing": [{ "tier": "...", "price": "...", "description": "..." }],
  "social_proof": [{ "quote": "...", "attribution": "...", "company": "..." }],
  "differentiators": ["..."]
}
```

**`brand-brief.md`** — plain markdown. Tone guidelines and messaging rules are prose; the content generator consumes them directly as a prompt fragment. PMMs write this directly — no extraction needed, though an agent could draft it from existing copy for review.

**How archetype and funnel stage interact with product context**

Product context is static — same features regardless of who's reading. What changes is how they're framed and emphasized. The content generator already handles this via behavioral tokens (copy density, evidence level). With real product data, a Validator in decision stage will naturally reach for the proof points; a Mover in awareness will naturally surface the one-liner. The LLM handles emphasis shift — the data just needs to be there.

**Dashboard integration: Brand Setup tab**

1. Paste source URLs and/or upload a doc
2. Run ingestion agent — extracts and structures into `product-context.json`
3. Review and edit the extracted output inline
4. Save — subsequent builds use it automatically

Brand brief is a separate text editor in the same tab. PMM edits it directly.

**Output file locations**

```
context/
├── product-context.json   ← structured factual data (machine-readable, LLM-injected)
└── brand-brief.md         ← editorial guidelines (human-readable, injected as prompt fragment)
```

Same flat-file pattern as `tokens/mode-tokens.json` — no database.

**Open questions before building**

1. **Source types for ingestion:** Website URLs (crawl) are the right starting point — most companies have a website. Doc upload and structured catalog are second-pass.
2. **Brand brief automation:** An agent could draft a brand brief from scraped copy for the PMM to edit. Probably don't fully automate — brand voice is a human judgment call.
3. **IA planner connection:** Product context likely also informs `ia-planner.js` — if the product has a strong features story, the IA might shift toward feature-heavy sections. Worth wiring after content generator is working.

**Build order**

1. Define `product-context.json` schema and wire it into `content-generator.js` prompt (can be hand-authored first to validate the injection)
2. Add `brand-brief.md` injection alongside it
3. Build the ingestion agent (URL → structured extraction)
4. Build Brand Setup tab in the dashboard

---

## ICP and product model

**ICP:** Code-first SaaS companies. They may have an existing design system or be starting fresh. What they're buying is the intelligence layer — the semantic config, the agent, the token resolver — not a managed service.

**Product model: kit, not SaaS.** Buy and deploy yourself. The buyer integrates MODE into their existing Next.js/React stack and brings their own visual system (Radix theme, design tokens, component library). MODE provides the intent mapping, the generation pipeline, and the routing patterns. They wire it to their stack.

This makes the expression layer / theme mapping separation (palette_modes → theme.json) architecturally important: the kit needs a clean handoff point where the buyer substitutes their own visual tokens without touching the intent layer.

**On routing:** The buyer implements routing themselves using patterns MODE provides. The demo site will include a working routing layer to show what this looks like in practice — but it's demo infrastructure, not a service MODE runs.

---

## Multi-page demo site

One page type doesn't prove the system — it proves the agent can generate a page. What the demo needs to show is **coherence across a site**.

The power of MODE isn't a single page that adapts. It's that a Validator landing on the homepage gets a consistent experience all the way through — the homepage reads them, the product page deepens the trust argument, the pricing page closes with the right weight. The semantic thread runs through the whole journey. That's what no other system can demonstrate.

**The four-page Validator journey**

| Page | Funnel stage | What shifts |
|------|-------------|-------------|
| Homepage | awareness | Broadest entry. All archetypes possible; Validator as default. |
| Product category | consideration | IA shifts toward depth. Social proof increases. Feature detail increases. |
| Single product page | decision | Heavy credibility, specific proof, pricing signal introduced. Palette visibly darkens vs. category. |
| Pricing page | conversion | Stripped down, high contrast, single action. CTABanner logic is already built for this. |

**The dimensions work at two scales**

Within a page, the palette map does intra-page work: this section gets dark, that one gets light. Component-level emphasis decisions.

Across pages, the funnel stage does macro work: the entire homepage is in an awareness register — light, open, low pressure. The entire pricing page is in a conversion register — dark, direct, high contrast. The palette shift isn't happening between sections anymore, it's happening between pages. The visitor experiences the system without seeing it.

This is what the dimensions were always for. The single-page view proves the mechanics. The multi-page view proves the intent. Until the four-page build, evaluation was happening at the wrong scale.

**The Mover contrast is the demo moment**

Run the same brief with Mover archetype. The IA collapses — fewer sections, less proof, direct path to conversion. Side-by-side with Validator, this is where the methodology becomes undeniable: same product, same funnel stage, fundamentally different experience because of who the visitor is.

**What the build system now supports**

The site view infrastructure is built. Each build run produces:
- N variant page files (`page-{ts}-{variant}.json`)
- One site manifest (`site-{ts}.json`) linking all variants
- `/admin/site?ts=&page=` renders any page with a fixed dark nav bar connecting all pages in the build

**What still needs to happen manually**

A funnel journey isn't one build — it's four separate builds with advancing funnel stages. The system doesn't yet understand that "awareness → consideration → decision → conversion" is a sequence; it just knows how to build one stage at a time. To produce the demo:

1. Run four builds with the same archetype/audience, advancing funnel_stage each time
2. Each build opens its own site view with all funnel variants linked
3. The four *site views* aren't cross-linked yet — that's the next layer

**Site brief (later):** Extend the agent to accept a site-level brief and generate all pages in one run with coherent semantic threading. The right long-term model. The current manual approach reveals what the site brief needs to handle before building it.

---

## What MODE is for

Every SaaS product has the same problem: a design system that knows how to render components but not *why* to render them. MODE adds the semantic layer — components that know which user they're talking to, where that user is in the funnel, and what emotional register the moment requires. The result is a design system that makes better decisions by default, reduces the QA burden on every page, and gives non-designers a structured way to build without breaking brand.

*Built under Hyve Digital. Prior works IP claim on file.*
