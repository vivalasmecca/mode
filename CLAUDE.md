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
| `feature-emphasis` | component role | `funnel_stage` | awareness, consideration, decision, conversion |
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

- **Overview** — shows preset, brief, behavioral tokens, and IA rationale for the latest output file. Includes a **Design Tokens** card with a direct link to Studio for remapping the color vocabulary and semantic assignments (replaces the old Token Resolution table).
- **Concepts** — static reference documentation for all brief fields and system concepts
- **Build** — the main UI for generating pages. Red "Foundational" chip warns that a build overwrites all Edit-tab changes.
- **Edit** — slot editor: left panel lists all sections; right panel shows editable fields for every slot in the selected section. Supports string, CTA (label + href), array, and read-only fields. **Links panel** across the top lets you set named link tokens (e.g. `checkout`) that populate HrefField shortcuts in the slot editor and write to `context/product-context.json`.
- **Brand** — extract product context from URLs, edit brand brief; both feed every build
- **Palette** — editable palette map grid + brand accent configuration (see below)
- **Studio** — full-screen canvas at `/admin/studio`. Header toggle switches between two modes: **Canvas** and **Design System**. Canvas has two views: **birds-eye** (all variants scaled side-by-side at ~19% scale via CSS transform; click a card to enter expanded) and **expanded** (scrollable 1:1 page preview + 272px token panel on the right). Token panel shows light/neutral/dark palette modes (6 slots each) plus accent; clicking a slot opens an inline color picker constrained to `color-scale.json` vocabulary — no open hex entry. Token changes apply live via `document.documentElement.style.setProperty()`, updating all rendered variants simultaneously. **Component swapper**: hover any section in expanded view to see the IA's `candidate_components` for that slot as chips in a dark overlay bar — candidates are semantically constrained (same classification, same funnel context). Click to swap; the override is ephemeral until saved. Save writes token changes to `theme.json` via `PUT /api/tokens/theme` and component overrides to each output file via `PUT /api/output/save`. **Design System mode**: replaces the canvas with a full-width editor for `color-scale.json` — the hex vocabulary. Each hue group (gray, indigo, etc.) renders as a card with a full-width color ramp and a step-by-step row list; clicking any swatch opens a native color picker. Changes apply live across all rendered variants via `reapplyAllVars()` (re-resolves all 18+ CSS vars through the updated scale). Save writes to `color-scale.json` via `PUT /api/tokens/color-scale`. Scale dirty state is tracked independently from theme token dirty state.
- **Run** — Deploy panel: lists active build timestamp and variant labels, shows last deploy time, and provides a "Deploy" button that commits `output/` + `config/` and pushes to trigger a Vercel build (content-lane deploy, separate from code-lane git push). Routing Activity table shows recent signal-routing decisions with source chips; **Clear history** button truncates `output/events.jsonl` immediately without a page reload.

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

**Palette tab:** Two sections — Brand Accent (global, not per-preset) and Palette Map (per-preset grid). Accent has `on_light` and `on_dark` variants for branded CTA buttons. Palette map cells cycle light → neutral → dark on click. Both have independent save states; saves write directly to `mode-tokens.json`. The accent preview and palette map cell backgrounds use resolved hex values (read via `color-scale.json` in the server component), not Tailwind class interpolation — so changes made in the Studio are reflected accurately on next page load.

**CSS variables layer — two-layer structure:**

`tokens/color-scale.json` — the color vocabulary. The brand's full color scale. Default ships with the complete **Radix Colors v3.0.0** palette — all 31 light-mode sRGB hues (slate, mauve, gray, sage, olive, sand + full chromatic spectrum), 12 steps each. Replace with your own brand scale or edit individual swatches in the Studio → Design System view.

`tokens/theme.json` — the semantic assignment. Maps MODE's palette tokens to entries in the color scale using dot notation: `"slate.12"`, `"violet.9"`, `"white"`. This is the remapping surface — change `dark.bg` from `"slate.12"` to `"iris.12"` here to inject brand color into high-emphasis sections without touching the vocabulary layer.

`ui/lib/palette-vars.ts` reads both files at request time. `resolve()` maps dot-notation references through the scale, with literal CSS passthrough as fallback. Returns a `Record<string, string>` of CSS custom properties applied to `<html style>` by `app/layout.tsx`. `ui/lib/palette.ts` is permanently static — Tailwind arbitrary-value syntax (`bg-[var(--mode-dark-bg)]`). Changes to either token file take effect on next request, no rebuild.

The integration contract for a buyer: bring `color-scale.json` (your vocabulary), configure `theme.json` (your semantic assignment). MODE's components and intent layer are untouched.

**Named links:** `context/product-context.json` → `named_links` holds a map of token names to URLs (e.g. `checkout → https://...`). The Edit tab's Links panel reads and writes these. In the slot editor, HrefField inputs show named link tokens as quick-select shortcuts alongside free-text URL entry. `PUT /api/brand/links` merges updates into the file.

**Two deployment lanes:** Code changes (`git push` → Vercel auto-build) and content changes (Deploy button → commits `output/` + `config/`, pushes to trigger build) are separate. "Nothing to deploy" from the Deploy button means no content files changed; code-lane deploys happen independently.

**Site manifest:** After each multi-variant build, `/api/generate/page` writes `output/site-{ts}.json` recording all variant files, preset, and base brief. The `/admin/site` route reads this to power the linked nav bar — no database, just the same flat-file pattern as the page outputs.

**Brand context:** `context/product-context.json` and `context/brand-brief.md` are read by `content-generator.js` on every build — no restart required. If `product_name` is empty, the files are ignored and the generator falls back to hallucinating product truth. If `checkout.primary_url` is set, CTA `href` values in generated pages point to the real checkout URL instead of `#`.

**Studio canvas:** `admin/studio` uses `position: fixed; inset: 0; z-index: 50` to visually escape the admin layout without a separate layout file. Birds-eye cards use `overflow: hidden` outer containers (280×490px) with a 1440px inner div scaled via `transform: scale(0.194); transform-origin: top left; pointer-events: none` — shows the top portion of each page variant at a glance. Live token updates call `document.documentElement.style.setProperty()` on the exact CSS var names that `palette-vars.ts` sets server-side (`--mode-{mode}-{slot}`, `--mode-accent-{side}-{slot}`); all rendered instances update instantly. After saving component overrides, the in-memory `activeVariants` state is patched with the new component names (via `applyOverridesToVariants`) so the display stays consistent without a page reload.

**Studio Design System mode:** The `colorScale` prop is lifted to component state (`initialColorScale` → `useState`) so edits in the Design System view flow into subsequent token panel operations without a reload. `reapplyAllVars(modes, accent, scale)` iterates all palette mode slots and accent variants and re-applies every CSS var when the scale changes — O(18) DOM writes, negligible. Scale dirty state and token dirty state are independent; the header "Unsaved changes" indicator fires on `dirty || scaleDirty`. `PUT /api/tokens/color-scale` preserves `_note` and `_source` metadata when writing.

**Component swapping constraint:** The Studio's hover overlay draws candidates from `output.ia.sections[].candidate_components` — the set the IA evaluated as semantically appropriate for that section's beat and funnel context. Only candidates that exist in `MODULE_REGISTRY` are shown. This prevents swapping a hero for a social card and prevents inserting editorial variants where the semantic mapping doesn't support them. The constraint is structural, not enforced by runtime rules.

**`PUT /api/output/save` extension:** Accepts optional `component` (string), `variant` (string | null), and `custom_variant` (string | null) fields alongside the existing `slots` object. At least one field must be present. The slot editor passes `slots`; the component swapper passes `component`; the manifest variant row passes `variant`; the named variant linker passes `custom_variant`. All paths write through the same route.

**Variant row in hover overlay:** The `ComponentSelectorBar` (two-row dark overlay on hover) now shows manifest variants in a second row below the component-selection chips. Clicking a variant chip patches the section's `variant` field in-memory immediately (no dirty/Save flow) and saves to disk via `PUT /api/output/save`. This uses `componentVariants: Record<string, string[]>` read from `manifest/components.json` at `studio/page.tsx` server time. The variant row is hidden when `manifestVariants.length <= 1`.

**Variant swapping is the universal primitive.** Component swap = different component entirely. Variant swap = same component, different configuration. Variant swapping works for ANY registered component regardless of internal implementation — including components from external design systems. The Studio exposes both swaps in the hover overlay.

**Slot visibility toggles are a first-party convention.** Toggling works only for MODE's own components that implement the `isVisible(name) = slotVisibility?.[name] !== false` gate. External components may not implement this pattern. This is not a universal primitive — it is a first-party editing affordance. External design systems plug in via variant swapping, not slot toggles.

**Alignment toggle removed from SlotEditor.** Alignment as a freeform override requires every component to implement `layout.align` through all nested divs. External components never will. Alignment belongs as a variant attribute — use variant swapping to select a left-aligned vs. centered variant; don't add a freeform toggle that silently fails on external components.

**Content-based slot derivation in SlotEditor.** Slot panels are derived from `currentSlots` (the actual section content on disk for this specific variant), not from the component manifest's slot list (which covers all possible slots for the component family). This means a quote-style `SocialProofBar` and a logo-strip `SocialProofBar` show different panels. CTA values (objects with a `label` key) are always-on/required; all other populated, non-array, non-media slots are toggleable.

**Named variant registry:** `tokens/variant-overrides.json` is the central store for user-created named variants. Each entry is keyed `ComponentName.slug` and stores `{ base_component, label, slot_visibility, layout }`. Named variants are created in the SlotEditor (right panel), appear in a dropdown on the ComponentSelectorBar, and are linked to sections via `custom_variant` in the section output JSON. The manifest `variant` field stays untouched — custom variants layer on top.

**Cross-variant slot content merge:** The Studio canvas merges slot content across all funnel-stage variant files for each section index (where all variants agree on the component). A slot that is null in the current funnel stage but populated in another stage is filled by the other stage's value. Computed in `useMemo` in `ExpandedView`; applied per section as `effectiveSlots` in `InteractiveSection`. Display-only — deployment files are not affected.

**`variant_slots` in the manifest eliminates ghost slots in SlotEditor.** The content generator populates all possible slots for a component regardless of which manifest variant is active — a `logos-only` `SocialProofBar` section has `quote` and `attribution` keys on disk even though the component never renders them. Without a filter, SlotEditor shows all populated slots, so the user sees toggles for content that has no visual effect. `variant_slots` in `manifest/components.json` declares exactly which slots each variant uses (e.g. `logos-only: ["headline", "logos"]`). SlotEditor reads `variant_slots[activeVariant]` to build an `allowedSlots` set and silently excludes any populated slot not in that set. Ghost slots disappear; only structurally relevant slots are shown. Add `variant_slots` to any component whose variants use meaningfully different slot subsets.

**Null-suppressor in InteractiveSection prevents PlaceholderSlot dashed boxes on the canvas.** Before the slot visibility system existed, components used `{slots.x && <p>}` — null rendered nothing. After wrapping nullable slots with `isVisible() + PlaceholderSlot`, null slots rendered `[slot_name]` dashed boxes on the Studio canvas even though they render nothing in real preview. The fix is an `autoSuppressNull` dict computed in `InteractiveSection`: for every slot in `section.slots` that is null or an empty array, `autoSuppressNull[name] = false`. This is merged with the resolved named-variant visibility (named variant wins), and the result is passed as `slotVisibility` to the Component. Canvas now matches real preview output exactly. The slot visibility editor is still live — users can re-enable a suppressed slot to populate it.

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
│   ├── mode-tokens.json             ← palette maps + behavioral tokens per preset + global accent
│   ├── color-scale.json             ← color vocabulary: full Radix Colors v3.0.0 (31 hues × 12 steps). Replace with your brand scale or edit in Studio → Design System.
│   ├── theme.json                   ← semantic assignment: maps palette tokens to color-scale.json entries via dot notation ("slate.12", "violet.9"). Changes take effect on next request (no rebuild).
│   └── variant-overrides.json       ← named variant registry. Keys are "ComponentName.slug"; values are { base_component, label, slot_visibility, layout }. Written by SlotEditor; read by studio/page.tsx and PreviewClient.
├── context/
│   ├── product-context.json         ← structured product facts (name, features, pricing, named_links)
│   └── brand-brief.md               ← tone, messaging pillars, claim territory (markdown)
├── output/
│   ├── page-{ts}-{variant}.json    ← generated page outputs (one per variant per run)
│   └── site-{ts}.json              ← site manifest (all variants for a build, written after generation)
└── ui/                              ← Next.js 16 dashboard + preview
    ├── next.config.ts               ← turbopack.root + serverExternalPackages
    ├── package.json                 ← includes mode-agent as file: dependency
    ├── proxy.ts                     ← signal detection + /admin block (local-only admin routes)
    ├── public/
    │   └── wordmark.svg             ← brand wordmark; rendered directly in NavigationHeader + FooterMinimal
    ├── app/
    │   ├── robots.ts                ← disallows /admin/ and /api/ for crawlers
    │   ├── layout.tsx               ← applies palette CSS vars to <html style> via getPaletteVars()
    │   ├── admin/                   ← all utility routes (local-only; 403 on Vercel)
    │   │   ├── layout.tsx           ← reads latest output, wraps all tabs
    │   │   ├── page.tsx             ← Overview tab
    │   │   ├── TabNav.tsx
    │   │   ├── build/
    │   │   │   ├── page.tsx         ← "Foundational" red warning chip + BuildClient
    │   │   │   └── BuildClient.tsx  ← "use client" — full build flow + Activate button
    │   │   ├── edit/
    │   │   │   ├── page.tsx         ← server: reads output + named links, passes to EditClient
    │   │   │   └── EditClient.tsx   ← "use client" — Links panel + split-panel slot editor
    │   │   ├── concepts/page.tsx    ← static reference docs
    │   │   ├── palette/
    │   │   │   ├── page.tsx         ← server: reads mode-tokens.json, passes to client
    │   │   │   └── PaletteClient.tsx ← "use client" — accent + palette map editor
    │   │   ├── brand/
    │   │   │   ├── page.tsx         ← server: reads context/ files, passes to client
    │   │   │   └── BrandClient.tsx  ← "use client" — URL extractor, JSON + markdown editors
    │   │   ├── run/
    │   │   │   ├── page.tsx         ← server: reads active build ts + variant labels
    │   │   │   └── RunClient.tsx    ← "use client" — Deploy button + deploy status panel
    │   │   ├── studio/
    │   │   │   ├── page.tsx         ← server: reads active build manifest + variant outputs + theme/scale JSON
    │   │   │   └── StudioClient.tsx ← "use client" — fixed full-screen canvas; Canvas mode (birds-eye + expanded + token panel + component swapper) and Design System mode (color-scale.json live editor)
    │   │   ├── preview/page.tsx     ← renders output JSON; supports ?file= param
    │   │   └── site/page.tsx        ← site view: fixed dark nav + PreviewClient; reads site manifest
    │   └── api/
    │       ├── config/route.ts      ← GET: active preset + variant config
    │       ├── output/
    │       │   ├── route.ts         ← GET: list output files
    │       │   └── save/route.ts    ← PUT: write slots, component, and/or variant to output file (slot editor + Studio)
    │       ├── tokens/
    │       │   ├── theme/route.ts           ← PUT: merge palette_modes + accent into theme.json (Studio token panel save)
    │       │   ├── color-scale/route.ts     ← PUT: merge hue entries into color-scale.json (Studio Design System save)
    │       │   └── variant-overrides/route.ts ← PUT: merge one named variant def into tokens/variant-overrides.json (SlotEditor save)
    │       ├── admin/
    │       │   ├── deploy/route.ts  ← POST: commit output/ + config/, push to trigger Vercel deploy
    │       │   └── events/route.ts  ← DELETE: truncate output/events.jsonl (clear routing history)
    │       ├── palette/
    │       │   ├── route.ts         ← PUT: save palette_map for a preset
    │       │   └── accent/route.ts  ← PUT: save accent tokens
    │       ├── brand/
    │       │   ├── ingest/route.ts  ← POST: fetch URLs → extract product context + draft brand brief
    │       │   ├── links/route.ts   ← PUT: merge named_links into product-context.json
    │       │   └── save/route.ts    ← PUT: write product-context.json and/or brand-brief.md
    │       ├── routing/
    │       │   └── activate/route.ts ← POST: write active build ts to config/routing.json
    │       └── generate/
    │           ├── ia/route.ts      ← POST: N IA proposals in parallel
    │           ├── content/route.ts ← POST: generate content for a single section
    │           ├── palette/route.ts ← POST: AI-assisted palette suggestion
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
        ├── palette-vars.ts          ← getPaletteVars(): reads theme.json at request time → CSS var object
        ├── palette.ts               ← getPalette(): static CSS var references (never needs updating)
        └── types.ts                 ← schema contract (PageOutput, PageBrief, etc.)
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
- **MODE product brief populated** — `context/product-context.json` has the real product one-liner, 10 features, two pricing tiers (MODE Kit $1199 one-time, MODE Studio TBD), and differentiators
- **CSS variables layer** ✓ — Two-layer token structure: `color-scale.json` (vocabulary) + `theme.json` (semantic assignment via dot-notation references). `palette-vars.ts` resolves references at request time and injects CSS custom properties on `<html style>`. `palette.ts` is permanently static. No rebuild required for palette changes.
- **Inline slot editor** ✓ — Edit tab at `/admin/edit`. Left panel: section list with component/variant/palette badges and unsaved indicators. Right panel: slot fields rendered by inferred type (string → textarea, CTA → label+href inputs, array → item cards with add/remove). Per-section Save button writes to disk via `PUT /api/output/save`.
- **Links panel** ✓ — horizontal strip above the slot editor. Named link tokens (e.g. `checkout`) map to real URLs and appear as shortcuts in HrefField inputs. Saved via `PUT /api/brand/links` → `context/product-context.json`.
- **Wordmark** ✓ — `ui/public/wordmark.svg`; rendered as `<img>` directly in NavigationHeader (h-7) and FooterMinimal (h-6). No slot dependency.
- **Build tab foundational warning** ✓ — red "Foundational" chip at top of Build tab reminds that a build overwrites all slot edits.
- **Run / Deploy panel** ✓ — shows active build timestamp + variant labels, last deploy time, and a Deploy button that commits `output/` + `config/` and pushes (content-lane deploy separate from code git push).
- **Palette tab hex fix** ✓ — Accent preview and palette map cell backgrounds now resolve `color-scale.json` references to hex server-side (`ResolvedColors` prop), so Studio token changes are accurately reflected without Tailwind class interpolation.
- **Studio** ✓ — `/admin/studio`. Canvas mode: birds-eye + expanded view, live token remapping, component swapper + variant row + slot visibility editor. Design System mode: full-width `color-scale.json` editor — hue group cards with color ramp + native color picker per step; changes apply live across all rendered variants via `reapplyAllVars()`; saves via `PUT /api/tokens/color-scale`.
- **Full Radix Colors palette** ✓ — `color-scale.json` ships with all 31 Radix Colors v3.0.0 light-mode sRGB scales (gray family + full chromatic spectrum, 12 steps each). `theme.json` updated to Radix dot-notation (`slate.12`, `violet.9`). Studio Design System view now shows the complete vocabulary.
- **Overview cleanup** ✓ — Token Resolution table removed from Overview; replaced with a Design Tokens CTA card that links directly to Studio with a description of the two editing surfaces (Design System for vocabulary, Canvas token panel for semantic remapping).
- **Clear routing history** ✓ — Run tab Routing Activity has a "Clear history" button that calls `DELETE /api/admin/events`, truncates `output/events.jsonl`, and empties the table immediately without a page reload.
- **Hero required on every page** ✓ — `HeroPrimary.funnel_stages` now includes `"conversion"` so the Orientation beat always finds a candidate. IA planner prompt updated to require a slim Hero before the Decision beat on conversion pages. Component selector prefers `text-only` variant for conversion stage (page title + subhead, no media, no secondary CTA). Fixed a related null-guard bug in `HeroPrimary.tsx` where `cta_secondary !== undefined` passed for `null`, crashing on `.label` — changed to `!= null`.

---

## What's next (as of June 2026)

### Now

**End-user validation.** Use the live site as a v1 end user before building more. Home + pricing is a skeleton. Navigate the funnel as a real visitor would — home through pricing — and find where the experience breaks, feels thin, or doesn't hold the semantic thread across pages.

**Brand brief + color tuning.** Not engineering tasks. Write `context/brand-brief.md` (tone, pillars, claim territory) — immediately improves copy register on the next build. Tune color and semantic token assignments via Studio → Canvas token panel and Design System mode. Both take effect without a rebuild.

### Next

**Archetype-mode site building.** The site builder currently only handles funnel-stage variant dimensions. Archetype mode (Mover/Validator/Explorer) is a different routing paradigm that needs to be validated as a first-class path before funnel-only assumptions calcify further. Getting this working closes the gap and prevents future development from papering around it.

**Additional site page — Solutions or Product.** A third page type fits between homepage (broad entry) and pricing (conversion close), likely in consideration → decision register. Before building it, the config design question needs an answer: how does `config/site.json` declare intermediate funnel pages — what variant dimension, what funnel stages, how does the nav link to it from every other page? Worth thinking through before touching the site builder.

**Component ingestion — external design system on-ramp.** Before the editing tools make sense for buyers with existing component libraries, there needs to be a structured way to register external components: declare them in `manifest/components.json` with beat + funnel stage + variant metadata, implement the `ModuleComponent` interface, and add them to the registry. This is earlier in the adoption sequence than it looks — it's the prerequisite for using MODE with a real design system.

**Component coverage matrix editor (productization).** The archetype × funnel_stage availability mappings in `manifest/components.json` are currently hand-edited JSON. The productized version is a UI grid — components on rows, funnel stages (or archetypes) on columns, cells toggled on/off to declare availability. Analogous to the palette map editor in the Palette tab, but for semantic coverage rather than color weight. A buyer with a different component set would configure their own coverage matrix rather than inheriting MODE's defaults. Not urgent — the manifest is stable enough to hand-edit during early adoption — but it's a natural product surface once component ingestion is working.

### Later

**Page zones.** IA planner generates zone map first, then fills sections per zone. Requires manifest zone affinity per component. Longer horizon — the current flat section list is sufficient until there's a real multi-section grouping need.

**CMS as revision layer.** LLM authors → CMS is the human exception-handling surface. Content schema is stable enough to consider. Payload (TypeScript-native, local) or Sanity (managed). Not until there's a real publishing workflow that needs it.

**Product catalog.** Current structure is single-product. Multi-SKU needs a catalog config. Not needed until there's more than one product.

### Done

- Full agent pipeline ✓ (brief → IA → component selection → token resolution → content generation)
- Multi-variant builds ✓ (4 funnel-driven or 3 archetype-driven variants per run; site manifest)
- Site build ✓ (`config/site.json` → all pages × variants in one run; nav injection; `config/pages.json`)
- Pricing page stability ✓ (reads explicit filename from `config/pages.json`; survives archetype builds)
- Three palette presets ✓ (funnel-driven, feature-emphasis, archetype-driven; selectable per build)
- Feature-emphasis preset correctly implemented ✓ (component-role driver; flat `{ component: mode }` palette map; `isFlat` flag in Palette tab UI; `config/site-feature.json` for site builds)
- CSS variables layer ✓ (`color-scale.json` vocabulary + `theme.json` semantic assignment; resolves at request time)
- Edit tab ✓ (slot editor, named links panel, beat group dividers, add-section picker with Generate option)
- Edit/Studio source sync ✓ (Edit defaults to active build manifest; same files as Studio)
- Beat visibility in Edit tab ✓ (beat headers in section list; beat label in slot editor header)
- Studio ✓ (birds-eye + expanded canvas; live token remapping; component swapper + variant row; Design System mode)
- Named variant registry ✓ (`tokens/variant-overrides.json`; SlotEditor creates named variants)
- Runtime signal routing ✓ (UTM, cookies, UA → funnel stage + archetype headers; `config/routing.json`)
- Brand context ✓ (`product-context.json` + `brand-brief.md`; Brand tab URL extractor + editors)
- LemonSqueezy checkout ✓ (checkout URL set in named links; CTAs resolved on build)
- Analytics attribution ✓ (local JSONL log + Run tab routing activity view)
- ContentSection + HeroStatement components ✓ (previously manifest-only; now built and registered)
- Decision stage IA improvements ✓ (Value beat in beat sequence; with-price hero rule in component selector)
- Deploy panel ✓ (Run tab commits output/ + config/ and pushes; content-lane separate from code push)
- Full Radix Colors v3.0.0 palette ✓ (31 hues × 12 steps; theme.json in Radix notation)

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

## Unresolved: Studio drift — orchestrator vs. micromanager

The Studio was conceived as an orchestration surface: stand above all variants, make intent decisions about the whole. It has drifted. The accumulated tools (token picker, slot visibility toggles, component swapper, named variant editor, Design System mode, variant row) now operate at the same level of abstraction as the Edit tab. Two detailed editing surfaces; no true orchestration layer.

**The specific drift:** the Studio can now change an individual hex value in a single section of a single variant. That's not orchestration — that's micromanagement. Every tool added was individually justified; collectively they pulled the Studio toward the weeds.

**What orchestration actually means at this scale:**
- Does the site hold a coherent argument end-to-end, across pages — not just within sections?
- Is emphasis landing at the right moments in the funnel, not just within one page's palette map?
- When you adjust the brief or the palette intent, what cascades?

None of those questions can be answered from the current Studio. They're brief-level and site-level questions; the Studio is a section-level tool wearing an orchestration costume.

**The open question:** what is the right form for an orchestration surface? Unclear yet. The end-user validation pass (using the live site as a real visitor) is likely where the need becomes concrete enough to design against. Don't redesign the Studio preemptively — let the gap reveal itself through use.

*The canvas and editing tools in the current Studio are genuinely useful. The issue is labeling and scope, not the tools themselves. The Studio may need to split: evaluation surface (what it does well) vs. something new for site-level orchestration.*

---

## Unresolved: customer journey and onboarding

The dashboard was built incrementally as features were added, organized by capability (Build, Edit, Studio, Palette, Brand, Run). Two distinct user journeys are now visible — and neither maps cleanly onto that structure.

**Journey 1 — zero to first build (new user)**

1. Spec the site — pages, routes, nav, variant dimension. Currently: manually edit `config/site.json`. No UI for this. The site brief doesn't exist as a first-class concept; the page brief does. This is backwards for how someone actually starts.
2. Brand setup — product context, brand brief. Brand tab exists.
3. Palette mode selection — see the three presets with your content, pick one. Currently a radio card in the Build form. Not positioned as a deliberate discovery moment.
4. First build → validate → deploy.

**Journey 2 — existing design system → MODE**

1. Component import and mapping — register existing components in `manifest/components.json`, implement `ModuleComponent` interface, add to registry. Currently: entirely manual, no UI, no guide.
2. Site mapping — declare existing pages in `config/site.json`. Also manual.
3. Palette mode selection — same as journey 1; understand how MODE's presets interact with your component set.
4. First adapted build → validate → deploy.

**The shared missing moment:** "What happens to my site in each palette mode? Let me see it, then I decide." Both journeys need this decision-support step early — after setup, before the first build commit. It's currently scattered across the Palette tab and Studio canvas, both of which assume familiarity with the system before you can evaluate what you're seeing.

**The dashboard architecture implication:** tabs-by-capability works at small scale. A company with 40 landing pages and an existing design system needs to feel like they're being onboarded into a system, not exploring an admin panel. The right organization is by stage (where are you, what do you decide now, what's next) not by feature. Small site creators may be fine with the current structure; the actual ICP — companies with real page manifests and some budget — probably needs something different.

**The connection to the Studio orchestration question:** the missing orchestration layer might not be a view at all. It might be the site setup flow — the moment where you declare your page structure, set the variant dimension, and understand the semantic logic before generating anything. If that deliberate onboarding moment existed, the Studio could go back to being what it should be: evaluation after intent is set, not the place where intent gets figured out.

**The toy trial moment.** The palette mode selection step isn't just a configuration decision — it's the moment where the value proposition becomes self-evident rather than described. Watching the same content shift in register, emphasis, and sequence as the intent context changes — awareness feeling open, conversion feeling focused, the Validator variant deepening where the Mover variant collapses — is something no other design system can show. It's not a feature list claim; it's visible in about 15 seconds once the right surface exists.

This means the onboarding design problem is: what is the shortest path from "I just got the kit" to those 15 seconds? Currently the answer is: write a brief, run a build, navigate to Studio, figure out the birds-eye view. That's too long and requires too much assumed context. The toy trial should probably work with zero configuration — a pre-loaded demo brief or a one-URL paste that extracts enough to generate something real — so the first thing a new user sees is the "whoa," not a setup form.

Getting the toy trial right is the highest-leverage onboarding problem. Everything else (site spec, component import, palette decision) is easier once someone has already understood why the system exists.

*Neither journey has a designed first-use experience yet. The right form isn't clear enough to build. End-user validation — using the live site and dashboard as an actual new user would — is the prerequisite for designing this well.*

### Feature artifacts by fork

**Shared — both forks need these**

| Artifact | What it is | Current state |
|---|---|---|
| **Toy trial surface** | Zero-config view showing the same content in all palette modes — the aha moment before any setup. Can draw from existing build output files; no new LLM calls required if pre-generated. | Nothing. Studio is only reachable after a build. |
| **Palette mode comparison** | Designed side-by-side or swappable view of all three presets rendered with real content. A deliberate decision moment, not a radio card in a form. "Here is your site in each mode — pick one." | Radio cards in Build form. Not rendered; not positioned as discovery. |
| **Site setup UI** | Form to build and edit `config/site.json` — add pages, set routes, variant dimension (funnel stage vs. archetype), variant values, nav links. | Manual JSON file. No UI. |
| **Onboarding status** | Lightweight setup checklist or progress state — brand context set? site structure declared? first build run? Guides the sequence without being a locked wizard. | Nothing. All tabs equally present; no concept of setup progress. |

**Fork 1 only — zero to first build**

No additional artifacts. The Brand tab, Build form, and deploy pipeline are the right tools — they need to be sequenced and surfaced correctly. Fork 1 is a journey design problem more than a missing feature problem.

**Fork 2 only — existing design system import**

| Artifact | What it is | Current state |
|---|---|---|
| **Component manifest editor** | UI to declare external components — name, beats, funnel stages, archetypes, variants, slot schema. Generates the `components.json` entry. | Manual JSON editing. No UI, no guidance. |
| **Integration scaffold generator** | Takes a component declaration and outputs TypeScript boilerplate implementing the `ModuleComponent` interface with the right props and slot shape — **including the palette pattern pre-wired** (see Component palette readiness contract below). Must not leave palette wiring as an exercise; components that skip it silently ignore all palette mode changes. | Not built. Pattern must be inferred from existing components. |
| **Component registration validator** | Checks that every component declared in `manifest/components.json` has a matching key in MODULE_REGISTRY. Surfaces the "unknown component" error at setup time, not at render time in Studio. | Nothing. Error only appears when the Studio tries to render. |
| **Page mapping mode** | Fork 2 users map existing pages onto MODE's site structure rather than declaring blank ones. The site setup UI needs an "import/declare existing" framing alongside the blank-page path. | Same gap as the shared site setup UI. |

**Sequencing implication**

Toy trial and palette mode comparison are mostly product design problems — they draw from what's already built. High leverage; unblock the aha moment before any configuration happens.

Site setup UI is a genuine missing config layer that unblocks both forks. `config/site.json` should never be a hand-edited JSON file for a real user.

Fork 2's three artifacts (manifest editor, scaffold generator, registration validator) form a contained sub-system — a "Component Setup" flow that makes the import path viable end-to-end.

Onboarding status is the last piece and only makes sense once the steps it tracks actually exist.

---

## Component palette readiness contract

Discovered during feature-emphasis implementation (June 2026): NavigationHeader and FooterMinimal were wired with `palette: _palette` — explicitly aliasing the prop away with a comment saying "chrome — always light regardless of page palette." When palette mode changes were made in the Studio, those components stayed white and appeared broken. The issue surfaced immediately as an apparent bug rather than a config gap.

This is the failure mode external design system components will hit by default: they accept a `palette` prop at the interface level but do nothing with it internally. Every mode switch will appear broken for those components until they're wired.

**What "palette compliance" means for a component:**

1. **Accept and use the prop — no exceptions.** Every component must accept `palette?: PaletteMode` and call `getPalette(palette ?? "light")`. There is no such thing as a "chrome" exemption — even nav and footer must be palette-responsive so structural palette presets (like feature-emphasis) can set them intentionally.

2. **Outer section/wrapper must use palette vars.** The outermost `<section>`, `<nav>`, `<footer>`, or equivalent must use `${p.bg}` and `${p.border}`. Hardcoding `bg-white` on the wrapper means the section never responds to palette mode regardless of what the palette map declares.

3. **Inner element hardcoding is acceptable when variant-driven.** Inner cards, badges, overlays, and variant-specific sub-elements can have hardcoded colors if they're governed by component variant logic rather than page palette (e.g., `PricingCard`'s inner dark card). The rule is: outer section = palette vars; inner variant-specific structure = can be hardcoded.

4. **`theme.json` must have visually distinct values for all three modes.** If `neutral.bg` and `light.bg` both resolve to `white`, a palette mode switch appears broken even when the component is correctly wired. This is an expression layer configuration issue, not a component bug — but it looks identical to a wiring bug. All three modes (`light`, `neutral`, `dark`) must have perceptibly different `bg` values. `neutral.bg` should be `slate.2` or equivalent — a step off white, not white itself.

**For the integration scaffold generator:**

The generated boilerplate must include this pattern pre-wired and non-optional:

```tsx
import { getPalette } from "@/lib/palette";

interface MyComponentProps {
  slots: ComponentSlots;
  variant: string | null;
  palette?: PaletteMode;  // ← required in interface; must not be aliased away
}

export function MyComponent({ slots, variant, palette }: MyComponentProps) {
  const p = getPalette(palette ?? "light");
  // ...
  return (
    <section className={`${p.bg} py-20`}>  {/* ← outer wrapper must use p.bg */}
```

If the scaffold leaves palette wiring as a comment or optional step, external components will ship broken by default — every Studio palette switch will appear to do nothing for that component.

**Validation checklist for new components:**

- [ ] Accepts `palette?: PaletteMode` (not aliased to `_palette`)
- [ ] Calls `getPalette(palette ?? "light")` inside the component body
- [ ] Outermost wrapper uses `${p.bg}` (not `bg-white`, `bg-gray-*`, or any hardcoded background)
- [ ] Outermost wrapper uses `${p.border}` for any border (not `border-gray-*`)
- [ ] Primary text uses `${p.text}` (not `text-gray-900`, `text-black`, etc.)
- [ ] Secondary text uses `${p.subtext}` or `${p.muted}`
- [ ] `theme.json` has distinct values for all three modes' `bg` fields before first use

**This checklist should be part of the component registration validator** — surface these gaps at setup time, not when a user switches palette mode in the Studio and nothing happens.

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

### Feature-emphasis is neither Mode A nor Mode B — it separates what varies

The critical distinction for feature-emphasis:

**Variants still exist** (awareness, consideration, decision, conversion). What funnel stage drives in this mode is **component selection and IA ordering** — not palette. An awareness homepage leads with breadth and brand; a conversion homepage collapses to proof and action. Those are structurally different pages. But all stages render with the same palette map: social proof sections are dark across all stages, content sections are neutral, nav is light.

**Palette mode in feature-emphasis is not the variant axis.** It is an editorial structural decision made once by the author — "social proof components are dark, supporting content is neutral" — that holds constant across all funnel stages. Changing it in the Studio or Palette tab is a brand/product decision that propagates to every variant simultaneously. It does not shift per funnel stage.

The separation of concerns:
- **Funnel stage → what components appear, in what order** (IA + component selector)
- **Component role → what palette weight each component carries** (palette map, constant across stages)

In funnel-driven, both axes shift per variant — the palette map assigns different weights per funnel stage AND the IA shifts. In feature-emphasis, only the IA shifts; the palette map is a shared editorial layer that doesn't vary by stage.

**Practical implication for the Studio:** the palette map panel in a feature-emphasis build is a layout/editorial tool — comparable to an art director deciding headers are always dark and supporting content is always light in a publication. It applies to all variants at once. Users who want palette to respond *differently per visitor* need funnel-driven or archetype-driven, not feature-emphasis.

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

## Runtime signal routing ✓ built

The full routing pipeline is complete and running on Vercel.

**What's built**

`proxy.ts` (Next.js middleware) runs on every request to `/` and detects signals in priority order:

- Query param overrides (`?funnel_stage=decision`, `?archetype=Mover`) — for testing
- UTM params: `utm_medium=retargeting/cpc/paid` → decision; `utm_medium=email/newsletter` → consideration; `utm_campaign` matching checkout/buy/cart → conversion
- UTM content: `utm_content=Mover|Validator|Explorer` → archetype
- Sticky cookies: funnel stage advances on each visit (awareness → consideration → decision → conversion); archetype is stored on first detection and preserved
- Mobile UA → Mover fallback
- Defaults: awareness, Validator

Detected signals are set as request headers (`x-mode-funnel-stage`, `x-mode-archetype`) for the page to read.

`config/routing.json` holds the active build's `ts` timestamp. Written by the Activate button in the Build UI.

`app/page.tsx` reads both headers, loads the site manifest for the active build, picks the matching variant page (using `palette_driver` to decide whether funnel stage or archetype is the routing dimension), and renders it via `PreviewClient`. Falls back to `<NoActiveBuild />` if no active build is set.

**What remains as enhancements (not blockers)**

- Analytics attribution — firing an event on each page load with the variant served, signals used, and preset. Needed to evaluate whether routing is working in practice.
- CDP/CRM integration — for identity-based archetype assignment when anonymous signal inference isn't sufficient.
- Intra-session funnel advancement — currently a visitor gets one variant per session. Real-time advancement within a session is a future-state concept.

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

## What MODE is: semantic layer, not site builder

This is a hard line worth naming explicitly because the codebase currently contains both a semantic engine and a demo rendering layer, and conflating them creates confusion about what the product actually is.

**Site builders** (Webflow, Framer, Squarespace) own the components, the rendering, and the hosting. The buyer uses the builder's visual system. Switching away means starting over.

**MODE is a semantic orchestration layer.** It owns the intent — which component role gets used where, with what content and semantic weight, at what funnel stage. The buyer owns all the visual infrastructure. MODE tells it what to do; the buyer's system does it.

### The demo UI is scaffolding, not the product

The Next.js components in `ui/components/modules/` (HeroPrimary, FeatureGrid, etc.) exist to prove the semantic logic is working. They make the agent output visible. They are not the deliverable.

The deliverable is:
1. **The agent pipeline** — IA planner, component selector, token resolver, content generator
2. **The intent configuration it produces** — the JSON output files (`output/page-{ts}-{variant}.json`)
3. **The routing layer** — signal detection + variant serving
4. **The integration contract** — the manifest, the output schema, theme.json, the component registry interface

A buyer brings their own `<HeroBanner>`, `<FeatureSection>`, `<PricingTable>`. MODE tells each one: this role, this variant, this content, this palette weight. The buyer's components render it.

### The integration contract

Four artifacts define how a buyer's system plugs into MODE:

| Artifact | What it defines | Who owns it |
|----------|----------------|-------------|
| `manifest/components.json` | Abstract component roles and their semantic properties | MODE |
| `tokens/mode-tokens.json` | Which palette mode each role gets in each context | MODE (buyer can customize) |
| `tokens/color-scale.json` | The brand's color vocabulary (full scale) | Buyer |
| `tokens/theme.json` | Which scale entries serve which semantic tokens per mode | Buyer (via remapping tool) |
| Component registry (`ui/components/modules/index.ts`) | Maps role names to concrete implementations | Buyer (replaces MODE's demo components) |

The output JSON is the runtime handoff: for each section, it specifies the role name, variant, content slots, and palette mode. The buyer's registry resolves the role name to their component, which reads the content and applies the palette. MODE's demo components are reference implementations of this contract.

### Why this matters for the codebase

Every architectural decision should be evaluated against this separation:
- Intent layer changes (manifest, mode-tokens.json, agent pipeline) — MODE's responsibility
- Expression layer changes (theme.json, palette.ts, component implementations) — buyer's responsibility at adoption time
- The demo UI blurs this by owning both — that's acceptable for demonstration but should never be mistaken for the product architecture

The inline slot editor, CMS integration, and CSS variables work all sit in the "demo tooling" category — they make the demo iterable. They are not part of the semantic layer itself.

---

## Naming — in transition

The working name "MODE" is being retired. "Mode" (the data-intelligence company) was acquired by ThoughtSpot for ~$200M — different category, same exact word, too close to build more brand equity on.

No replacement chosen yet. Strongest survivors after an extended elimination pass: **Stet**, possibly others. Many directions ruled out for trademark or domain collisions (Valence, Register, Tenor, Altitude, Sigil, Cascade, Colophon, Didot, Marca, Splice, Rollo, Casca, and ~10 others).

**For codebase purposes:** Don't hardcode the product name any deeper into brand-facing surfaces. Keep it swappable in hero copy, pricing pages, and customer-facing docs so a rename doesn't require a structural rewrite. Internal names — variable names, file paths, `mode-agent` package name — don't need to change yet. Brand-layer decision only.

---

## ICP and product model

**ICP:** Code-first SaaS companies — particularly those with existing design systems and real page manifests. What they're buying is the intelligence layer (semantic config, agent pipeline, token resolver) plus a hosted control plane for managing and iterating on it collaboratively.

**Product model: hosted control plane, git-synced.** *(Correction: earlier docs stated "kit, not SaaS" — that framing is now wrong and should not be repeated.)*

The dashboard (Overview, Build, Edit, Brand, Palette, Studio, Run) is a hosted SaaS control plane — collaborative, team-based, persistent. It synchronizes to the buyer's repo rather than owning a database that the live site depends on. "Save" actions in the dashboard commit config/token/manifest changes into the buyer's git repo — same pattern as Contentful's git-sync or the Figma Tokens plugin.

**The deployed site never calls this product at runtime for rendering.** Signal detection, routing, component selection, and content resolution all execute from repo-committed config inside the buyer's own deployment. The "no runtime dependency" promise means no dependency on this product's uptime — not "no hosted product at all."

What this means in practice:
- The dashboard is the product. Teams build, edit, approve, and deploy from it.
- The buyer's site is the runtime. It reads committed config; this product is not in the request path.
- Git sync is the integration contract. The buyer's repo is the source of truth for what's deployed.

**Pricing:** The $1,199 one-time kit price in `context/product-context.json` was an early hypothesis — it is now stale. A SaaS-leaning model likely means hybrid pricing: seat-based or subscription for dashboard access, still no recurring dependency for the rendering layer. Don't treat the current pricing copy as locked.

**Multi-system sync (open, not yet scoped):** Plans exist for additional sync targets beyond git — Figma variables, headless CMSs, Storybook, generic webhooks/API. Don't over-build a git-only sync abstraction if multi-system sync is a near-term goal. Worth an adapter-layer design pass before going deeper on the git implementation specifically.

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

Every SaaS product has the same problem: a design system that knows how to render components but not *why* to render them. MODE adds the semantic layer — components that know which user they're talking to, where that user are in the funnel, and what emotional register the moment requires. The result is a design system that makes better decisions by default, reduces the QA burden on every page, and gives non-designers a structured way to build without breaking brand.

*Built under Hyve Digital. Prior works IP claim on file.*

---

## Competitive positioning

Researched the adjacent landscape. Two clusters exist; neither does what this product does. The gap between them is the actual product.

**Cluster 1 — AI website personalization / CRO platforms**
(Mutiny, Intellimize, Abmatic AI, Instapage, AB Tasty, Dynamic Yield)

Runtime-only. Swap copy and sections within a fixed, existing page structure based on visitor segment or funnel stage. Sold to marketing/growth/ABM teams at enterprise pricing (sales-led). Cannot restructure page narrative, propose IA, or generate new component selections. The page architecture is assumed; they work inside it. The page *structure* is never their concern.

**Cluster 2 — AI design system generators**
(Figma's native AI agent, Figr Identity, Anima's Buddy, "Figma Intelligence" plugin)

Design-time only. Help build and audit token/component hierarchies, generate code from designs, maintain semantic consistency across a design system. None of them resolve anything at runtime based on who is visiting or where they are in the funnel. The visitor is invisible to them.

**The white space:** generating IA and component selection from a brief — Cluster 2's territory — *and* resolving which variant a live visitor sees based on archetype/funnel stage/intent state/context mode — Cluster 1's territory — owned by the dev/design team rather than rented as a marketing SaaS, with human overrides as first-class signal rather than something the system fights against.

This positioning is validated and strong enough to be load-bearing in brand materials. Worth a "how is this different from X" section in the marketing site and docs once the rename resolves. The hero line shouldn't be updated yet (anchored to the retiring name), but the underlying claim is ready.

---

## Open decisions — resolve before building further

**1. Routing Activity telemetry source**

The Run tab's Routing Activity table shows live routing events ("5m ago"). If the deployed site never calls this product at runtime, this data has to come from somewhere else — either pulled from the buyer's own analytics/logging platform, or via an explicitly optional non-load-bearing reporting ping (site functions identically whether or not the ping succeeds). Decide this before building out the telemetry layer further.

**2. Variant override logging model**

When a human overrides the resolver's variant pick (e.g., changes HeroPrimary from "text-only" to "editorial" in the Studio), should that be:
- (a) logged as a deviation that could inform future resolver tuning, or
- (b) accepted silently as new ground truth with no distinction from a resolver-default pick?

This changes the data model for what gets written to `output/page-{ts}-{variant}.json`. Decide before building the variant override UI affordance.

**3. Multi-system sync scope**

Git sync is the current integration contract. Plans exist for additional targets (Figma variables, headless CMSs, Storybook, webhooks). Decide whether to build git sync as a specific implementation or design an adapter layer now that git sync is the first adapter of. Affects how the Run tab deploy flow and dashboard "Save" actions are architected.

**4. Run tab deploy flow — local shell vs. hosted API**

The current `POST /api/admin/deploy` implementation runs `git add/commit/push` as local shell commands via Node's `exec`. This only works when the dashboard is running locally with git credentials configured. In a hosted SaaS context, this becomes a GitHub API call (with OAuth tokens and repo write access) — a structurally different implementation that can't be reached by extending the current one.

The decision: is the dashboard local-only for the foreseeable future (in which case the shell implementation is fine), or is hosting the next significant milestone (in which case this needs to be replaced, not extended)? Don't build more deploy logic on top of the shell implementation until this is settled. The seam between "run a shell command" and "call an API with an OAuth token" needs to be named even if the API version isn't built yet.

Related: authentication has no scope or sequencing in the current roadmap. A hosted dashboard requires at minimum single-user auth before it can be shared. That's a prerequisite that isn't tracked anywhere.

---

## Architecture note: Variant as an editable resolution slot

Current state: `component-selector.js` (Claude Haiku) selects component + variant per IA slot. Palette is already overridable — the Studio's token panel and Palette tab let a human remap palette mode per component per context. Variant has no equivalent affordance; it's resolver output only, even though the manifest already documents multiple valid variants per component with rationale for when each applies.

**Direction:** Make Variant behave the way Palette already does. Show the resolver's pick as the default; allow a human override via a dropdown scoped to the valid variants for that component's archetype/funnel-stage combination (per the manifest). This is consistent with the existing override model and doesn't require a new paradigm — just applying the same pattern one layer down.

Blocked on open decision #2 above (override logging model) before the UI affordance is built.
