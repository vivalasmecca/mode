# MODE Integration Guide

MODE is a semantic orchestration layer for SaaS design systems. It sits between your brief ("who is this visitor, where are they in the funnel") and your component library ("which components, which variants, which content"). Your components render. MODE decides what they say and when.

This guide walks through integration at three adoption levels. You can stop at any level and have a working system.

---

## What MODE does and does not own

**MODE owns:**
- The intent layer — which component role belongs in which section, for which visitor, at which funnel stage
- The generation pipeline — IA planning, component selection, content generation
- The routing middleware — detecting visitor signals and serving the matching variant
- The output schema — the JSON contract your components read from

**You own:**
- Your component library — MODE never touches your component implementations
- Your design tokens — `color-scale.json` (your vocabulary) and `theme.json` (your semantic assignment)
- Your hosting, your deploy pipeline

There is no sync dependency between MODE and Figma, your CMS, or your CI pipeline. MODE generates flat JSON files. Your site reads them. That's the integration surface.

---

## The three adoption levels

### Level 0 — Routing and palette (no copy work required)

What you get: visitors are detected and routed to the variant file that matches their signal (UTM, cookie, UA). Each variant file has a palette assignment per section. Your components apply the palette.

What you skip: you don't need to think about copy density, archetype differentiation, or behavioral tokens. The system generates competent, single-profile copy. When you're ready to differentiate copy by visitor type, that's Level 2.

**Effort:** Middleware configuration + output file serving. No component changes required beyond accepting the content slots.

---

### Level 1 — Component registration and slot filling

What you get: MODE's agent generates IA, selects your components, and populates your content slots. You review and approve in the dashboard. The output is a JSON file your renderer reads.

What this requires: your components registered in `manifest/components.json` and accepting a `slots` prop.

---

### Level 2 — Behavioral tokens and archetype-differentiated copy

What you get: copy density, evidence level, and CTA rules vary by visitor archetype. A Validator gets longer copy with source-cited proof points. A Mover gets one-line headlines and a single CTA. A Mover and Validator visiting the same page get meaningfully different experiences.

What this requires: nothing extra in your components. Behavioral tokens are instructions to the LLM content generator — your component renders whatever string lands in the slot. The component doesn't know it's "Mover-terse." It just renders.

The only reason to not use Level 2 is if you want to run a single-archetype build (e.g. "we only care about the Validator"). That's a valid choice — just set one archetype in the brief.

---

## Level 1 in detail: registering your components

### The manifest entry

Every component you want MODE to use needs an entry in `manifest/components.json`. This is declarative config — no code.

```json
{
  "name": "HeroBanner",
  "purpose": "Page-opening statement. Establishes context and intent above the fold.",
  "tier": "module",
  "beats": ["Orientation"],
  "archetypes": ["Mover", "Validator", "Explorer"],
  "funnel_stages": ["awareness", "consideration", "decision", "conversion"],
  "variants": ["editorial", "text-only", "with-media"],
  "slots": {
    "headline": "string",
    "subhead": "string | null",
    "cta_primary": "CTAButton",
    "cta_secondary": "CTAButton | null",
    "trust_signal": "string | null",
    "media": "image | video | null"
  },
  "notes": "editorial variant is the high-expression awareness layout. text-only for conversion — slim title only, no competing elements. with-media for consideration-stage depth."
}
```

**Key fields:**

- `beats` — which narrative moment this component covers. Options: `Orientation`, `Credibility`, `Value`, `Evidence`, `Decision`, `Conversion`, `Recovery`. This is how the IA planner knows what to put where.
- `archetypes` — which visitor types this component is appropriate for.
- `funnel_stages` — which pages this component is eligible to appear on.
- `variants` — the layout modes your component actually implements. Only list variants you've built.
- `slots` — the content contract. What strings, CTAs, and arrays the component can render. `string | null` means the slot is optional.
- `notes` — this is the LLM context. Write it in plain English. The component selector reads these notes to choose the right variant for the brief. Be specific about when to use which variant.

### The slot types

```
"string"           → plain text field
"string | null"    → optional text field (component handles empty gracefully)
"CTAButton"        → { label: string, href: string }
"CTAButton | null" → optional CTA
"image | null"     → optional image (skipped by content generator; you supply these)
[{ ... }]          → array of objects (features list, stat block, etc.)
```

Image slots are never populated by the content generator. The agent skips them. You wire those separately.

### The component interface

Your component needs to accept these props:

```tsx
interface ModuleComponentProps {
  slots: Record<string, unknown>;   // content from the output file
  variant: string | null;           // the selected variant name
  palette?: "light" | "neutral" | "dark"; // semantic emphasis
  slotVisibility?: Record<string, boolean>; // optional — Studio slot toggles
  layout?: { align?: "left" | "center" };  // optional — Studio layout overrides
}
```

`slotVisibility` and `layout` are only needed if you want Studio slot editing to work. If you skip them, component swap and variant swap still work — only the slot toggle feature is disabled.

### Registering in the component registry

Add your component to `ui/components/modules/index.ts`:

```ts
import { HeroBanner } from "@/components/your-system/HeroBanner";

export const MODULE_REGISTRY: Record<string, ModuleComponent> = {
  HeroBanner,
  // ...
};
```

The registry key must match the `name` field in your manifest entry exactly.

---

## The palette contract

MODE resolves palette to one of three semantic states per section: `light`, `neutral`, `dark`. What those states look like is entirely yours.

The mapping lives in two files:

**`tokens/color-scale.json`** — your color vocabulary. Replace the default Radix Colors palette with your brand scale. Structure: `{ "brand": { "50": "#...", "100": "#...", ... } }`.

**`tokens/theme.json`** — your semantic assignment. Maps MODE's palette tokens to entries in your scale using dot notation:

```json
{
  "light": {
    "bg": "gray.50",
    "text": "gray.900",
    "subtext": "gray.600"
  },
  "dark": {
    "bg": "brand.900",
    "text": "white",
    "subtext": "brand.200"
  },
  "neutral": {
    "bg": "gray.100",
    "text": "gray.800",
    "subtext": "gray.500"
  }
}
```

`light`, `neutral`, `dark` are semantic states, not visual designs. "This section should be high emphasis" is MODE's judgment call. What high emphasis looks like in your system is yours to define.

You can edit both files in the Studio dashboard without touching code. Changes take effect on the next page request — no rebuild required.

---

## Routing

The routing middleware (`proxy.ts`) runs on every request to `/` and detects visitor signals in priority order:

1. Query params — `?funnel_stage=decision`, `?archetype=Mover` (for testing)
2. UTM params — `utm_medium=retargeting` → decision; `utm_medium=email` → consideration
3. Sticky cookies — funnel stage advances each visit; archetype persists once detected
4. Mobile UA → Mover fallback
5. Default — awareness, Validator

Detected signals become request headers (`x-mode-funnel-stage`, `x-mode-archetype`). The page route reads these headers, loads `config/routing.json` to find the active build, and picks the matching variant file from the site manifest.

**To activate a build:** go to the Run tab in the dashboard and click Activate. This writes the build timestamp to `config/routing.json`. The live route starts serving that build immediately.

**To test variants locally:**
```
localhost:3000/?funnel_stage=awareness
localhost:3000/?funnel_stage=decision
localhost:3000/?archetype=Mover
localhost:3000/?archetype=Validator
```

Query params override cookies, so you can test any variant without clearing state.

---

## What you get at each level

| Capability | Level 0 | Level 1 | Level 2 |
|---|---|---|---|
| Signal detection + routing | ✓ | ✓ | ✓ |
| Palette per section | ✓ | ✓ | ✓ |
| IA-generated page structure | — | ✓ | ✓ |
| Component + variant selection | — | ✓ | ✓ |
| Generated content per section | — | ✓ | ✓ |
| Studio canvas + swap tools | — | ✓ | ✓ |
| Archetype-differentiated copy | — | — | ✓ |
| Copy density / evidence rules | — | — | ✓ |
| Slot visibility toggles | — | optional | optional |

---

## What you don't need to do

- **Rewrite your components.** Adding a `slots` prop and a `palette` prop to an existing component is an afternoon, not a sprint.
- **Replace your CMS.** MODE generates content into flat JSON files. If you have a CMS, you can use MODE's output as a starting point and paste selectively — or wire MODE output directly if you want fully generated pages.
- **Synchronize with Figma.** MODE's output is code-native. The semantic mapping lives in config files, not a Figma plugin. No sync dependency.
- **Configure copy density.** Level 2 is optional. A single-archetype or single-funnel-stage build produces high-quality content without behavioral token differentiation. You can adopt that layer later.

---

## The minimum viable integration checklist

- [ ] Register at least one component in `manifest/components.json`
- [ ] Add that component to `ui/components/modules/index.ts`
- [ ] Your component accepts `slots`, `variant`, `palette` props
- [ ] Replace `tokens/color-scale.json` with your brand color scale
- [ ] Set semantic assignments in `tokens/theme.json`
- [ ] Set `checkout.primary_url` in `context/product-context.json` (CTAs point to real checkout)
- [ ] Write `context/brand-brief.md` (tone guidelines + messaging pillars)
- [ ] Copy `proxy.ts` routing middleware into your Next.js app
- [ ] Generate a build in the dashboard, activate it in the Run tab
- [ ] Test with `?funnel_stage=` and `?archetype=` query params

That's it. Everything else is progressive enhancement.
