# MODE — Dashboard UI

Next.js 16 dashboard for the MODE page builder agent. Generates intent-aware landing pages, previews output, and routes live visitors to the right variant.

## Getting started

```bash
cd ui
npm install
npm run dev
```

The dashboard runs at `http://localhost:3000`.

## Routes

| URL | Description |
|-----|-------------|
| `/` | Live routing — serves the active build's correct variant per visitor |
| `/dashboard/build` | Generate multi-variant page builds |
| `/dashboard/palette` | Edit palette maps and brand accent |
| `/dashboard/brand` | Extract product context from URLs; edit brand brief |
| `/dashboard/concepts` | Reference documentation for brief fields |
| `/preview` | Render the latest output file |
| `/preview?file=page-{ts}-{variant}.json` | Render a specific variant |
| `/site?ts={ts}` | Site view — all variants from a build with linked nav |

## Build flow

1. Go to `/dashboard/build`
2. Select a palette approach (funnel-driven, feature-emphasis, or archetype-driven)
3. Fill in the brief (audience, goal, fixed dimension)
4. Review proposed information architectures per variant
5. Approve → generates all variants in parallel
6. **Activate** → sets this build as live at `/`

## Runtime routing (`/`)

`/` is driven by `proxy.ts` (edge layer) + `app/page.tsx` (server component).

**Signal detection (priority order)**

Funnel stage:
1. `?page=` or `?funnel_stage=` — direct override (testing)
2. `?utm_medium=email|newsletter` → consideration
3. `?utm_medium=retargeting|cpc|paid` → decision
4. `?utm_campaign=` matching `checkout|purchase|buy|cart` → conversion
5. `mode_funnel_stage` cookie — advances one stage per visit
6. Default → awareness

Archetype:
1. `?archetype=` — direct override
2. `?utm_content=` — UTM-declared archetype
3. `mode_archetype` cookie — sticky once set
4. Mobile user agent → Mover
5. Default → Validator

**Cookie behavior**

- `mode_funnel_stage` — stores the *next* stage so each return visit advances one step (awareness → consideration → decision → conversion; conversion stays). 30-day max-age.
- `mode_archetype` — sticky. Set on first detection, preserved thereafter. 30-day max-age.

**Activating a build**

After generating a build, click **Activate** in the done state. This calls `PUT /api/routing/activate` with the build's `ts`, which writes `config/routing.json`:

```json
{ "ts": "2026-06-16T03-55-29-918Z" }
```

`/` reads this file on every request, loads `output/site-{ts}.json`, resolves the right variant for the visitor, and renders it. If no build is active, `/` shows a "No active build" state with a link to the Build tab.

## Config files read at runtime

| File | Purpose |
|------|---------|
| `../tokens/mode-tokens.json` | Palette maps, behavioral tokens, active preset |
| `../context/product-context.json` | Product facts injected into every build |
| `../context/brand-brief.md` | Tone and messaging guidelines |
| `../config/routing.json` | Active build pointer (written by Activate) |
| `../output/site-{ts}.json` | Site manifest for the active build |
| `../output/page-{ts}-{variant}.json` | Individual variant page files |

Paths are relative to `ui/` (where `process.cwd()` resolves at runtime).

## API routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/config` | GET | Active preset + all preset configs |
| `/api/generate/ia` | POST | Propose N information architectures in parallel |
| `/api/generate/page` | POST | Run full pipeline for N variants; writes output files |
| `/api/generate/content` | POST | Re-run content generation only (preserves IA + components) |
| `/api/generate/palette` | POST | Re-apply a different palette preset to existing pages |
| `/api/routing/activate` | PUT | Set active build for `/` routing |
| `/api/palette` | PUT | Save palette map for a preset |
| `/api/palette/accent` | PUT | Save brand accent tokens |
| `/api/brand/ingest` | POST | Extract product context from URLs |
| `/api/brand/save` | PUT | Write product-context.json and/or brand-brief.md |
| `/api/output` | GET | Latest output file (JSON) |
