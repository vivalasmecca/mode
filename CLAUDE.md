# MODE — Page Builder Agent
## Claude Code Kickoff Document
**Project:** MODE / Hyve Digital (prior works — IP protected)**
**Build context:** Nights + weekends. Independent of LZ.

---

## What this project is

MODE is an intent-aware design system built as a semantic layer on top of Radix UI components, targeted at SaaS businesses. The page builder agent is the first working surface — it takes a brief, proposes an information architecture, then selects and populates components to build a semantic HTML page.

The agent exists. The component manifest is the missing piece that unblocked it.

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

*These archetypes predate this project and are core IP.*

---

## The page builder agent — what exists

The agent was built during an AI build day. It works as follows:

1. User provides a brief (audience, intent, goal)
2. Agent proposes an information architecture (IA)
3. User approves the IA (human in the loop)
4. Agent selects components to fill each IA slot
5. Agent generates semantic HTML output

**Where it stalled:** Figma component exports are not semantic HTML. The agent was trying to map visual component trees to functional components — the translation breaks down. The fix is a component manifest that gives the agent a stable reference instead of relying on Figma exports.

**CLI vs UI:** Agent runs in Claude Code CLI. Briefing output in CLI is functional but ugly. A lightweight React approval UI is possible — CLI handles agent logic, React handles human approval steps for IA and component selection. This is worth building.

---

## Picking up mid-build

When dropping back in after time away, start here:

1. **Check what's in `/manifest/`** — if `components.json` exists, the manifest is seeded. If not, that's the first task.
2. **Run the agent on a test brief** — use "SaaS trial conversion page, Validator archetype, decision stage" as the canonical test case.
3. **Look at where it breaks** — component selection accuracy is the metric. Does it pick the right module? Does it populate slots correctly?
4. **The visual mapping tool question is always open** — don't architect it until you have 2–3 real examples of what you'd want to configure.

---

## Unresolved: visual mapping tool

The hard architectural question is the handoff between discovery and build:

- **Discovery mode** — visual, tactile. Designer defines what "Validator in decision stage" *feels* like. Color temperature, type weight, spatial density. Impressionistic.
- **Build mode** — structured, token-mapped, exportable. Those impressions translated into actual token values the resolution engine consumes.

The gap: how does a designer set token values per dimension, and does the system compose them (per dimension × dimension = token value) or assign them per mode (Validator-in-decision is a single named profile)?

*Come back to this with 2–3 concrete examples before architecting further.*

---

## File structure

```
mode/
├── CLAUDE.md                  ← agent instructions + project context
├── manifest/
│   ├── components.json        ← component manifest v1
│   └── micro-blocks.json      ← primitive definitions
├── agent/
│   ├── page-builder.js        ← main agent logic
│   ├── ia-planner.js          ← IA proposal step
│   └── component-selector.js  ← manifest-aware selection
├── ui/
│   └── approval-ui.jsx        ← React approval interface (future)
├── tokens/
│   └── mode-tokens.json       ← token profiles per dimension (future)
└── output/
    └── *.html                 ← generated pages
```

---

## What MODE is for

Every SaaS product has the same problem: a design system that knows how to render components but not *why* to render them. MODE adds the semantic layer — components that know which user they're talking to, where that user is in the funnel, and what emotional register the moment requires. The result is a design system that makes better decisions by default, reduces the QA burden on every page, and gives non-designers a structured way to build without breaking brand.

*Built under Hyve Digital. Prior works IP claim on file.*
