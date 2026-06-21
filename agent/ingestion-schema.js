"use strict";

/**
 * MODE Ingestion Declaration Schema
 *
 * A declaration file describes how to bridge an external component into
 * the MODE pipeline. Three translation layers are required:
 *
 *   1. Semantic identity  — which MODE manifest type this component maps to.
 *      If modeType matches an existing entry in components.json, semantic
 *      metadata (beats, archetypes, funnel_stages, variants) is inherited
 *      from that entry. If modeType is new, the declaration must provide
 *      all semantic metadata explicitly.
 *
 *   2. API shape         — how MODE's standard slot names map to the external
 *      component's props. Named type transforms handle common conversions.
 *
 *   3. Palette bridge    — when MODE assigns palette: "dark" to a section,
 *      what prop values does that translate to in the external component's API?
 *      All three modes (light, neutral, dark) must be declared.
 *
 * Declaration format (JSON):
 * {
 *   "name":     "HeroSection",          // external component export name (required)
 *   "source":   "@acme/design-system",  // npm package or relative path (required)
 *   "modeType": "HeroPrimary",          // MODE manifest type this replaces (required)
 *
 *   // Slot mapping — MODE slot name → external prop (optional per slot)
 *   "slots": {
 *     "headline":     { "prop": "title" },
 *     "subhead":      { "prop": "body",          "type": "string?" },
 *     "eyebrow":      { "prop": "label",         "type": "string?" },
 *     "cta_primary":  { "prop": "primaryAction", "type": "cta"     },
 *     "cta_secondary":{ "prop": "secondaryAction","type": "cta?"    },
 *     "logos":        { "prop": "logoList",      "type": "array"   }
 *   },
 *
 *   // Variant mapping — MODE variant name → external prop values to spread
 *   "variants": {
 *     "editorial": { "layout": "full-bleed", "size": "large"   },
 *     "text-only": { "layout": "centered",   "size": "default" }
 *   },
 *
 *   // Palette bridge — MODE palette mode → external prop values to spread
 *   "palette": {
 *     "light":   { "theme": "light"  },
 *     "neutral": { "theme": "muted"  },
 *     "dark":    { "theme": "dark"   }
 *   }
 * }
 *
 * Slot type transforms:
 *   "string"  (default) — slots.SLOT as string
 *   "string?" — slots.SLOT as string ?? undefined   (nullable → undefined)
 *   "number"  — slots.SLOT as number
 *   "cta"     — { label: string, href: string }     (required CTAButtonSlot)
 *   "cta?"    — { label, href } | undefined         (optional CTAButtonSlot)
 *   "array"   — slots.SLOT as any[]
 *   "passthrough" — untyped passthrough (slots.SLOT)
 */

const SLOT_TYPES = ["string", "string?", "number", "cta", "cta?", "array", "passthrough"];
const REQUIRED_PALETTE_MODES = ["light", "neutral", "dark"];

/**
 * Validate a declaration object.
 * Returns { valid: boolean, errors: string[] }.
 */
function validateDeclaration(declaration) {
  const errors = [];

  if (!declaration || typeof declaration !== "object") {
    return { valid: false, errors: ["declaration must be a non-null object"] };
  }

  // Required top-level fields
  if (!declaration.name || typeof declaration.name !== "string") {
    errors.push('name is required (string — the external component export name)');
  }
  if (!declaration.source || typeof declaration.source !== "string") {
    errors.push('source is required (string — npm package or relative path)');
  }
  if (!declaration.modeType || typeof declaration.modeType !== "string") {
    errors.push('modeType is required (string — the MODE manifest type this component maps to)');
  }

  // slots — optional but if present must be a valid object
  if (declaration.slots !== undefined) {
    if (typeof declaration.slots !== "object" || Array.isArray(declaration.slots)) {
      errors.push('slots must be an object');
    } else {
      for (const [slotName, slotDef] of Object.entries(declaration.slots)) {
        if (!slotDef || typeof slotDef !== "object") {
          errors.push(`slots.${slotName} must be an object`);
          continue;
        }
        if (!slotDef.prop || typeof slotDef.prop !== "string") {
          errors.push(`slots.${slotName}.prop is required (string — external prop name)`);
        }
        if (slotDef.type !== undefined && !SLOT_TYPES.includes(slotDef.type)) {
          errors.push(`slots.${slotName}.type "${slotDef.type}" is not valid. Use one of: ${SLOT_TYPES.join(", ")}`);
        }
      }
    }
  }

  // variants — optional but if present must be a valid object
  if (declaration.variants !== undefined) {
    if (typeof declaration.variants !== "object" || Array.isArray(declaration.variants)) {
      errors.push('variants must be an object keyed by MODE variant name');
    } else {
      for (const [variantName, variantProps] of Object.entries(declaration.variants)) {
        if (typeof variantProps !== "object" || Array.isArray(variantProps)) {
          errors.push(`variants.${variantName} must be an object of external prop values`);
        }
      }
    }
  }

  // palette bridge — required; all three modes must be declared
  if (!declaration.palette) {
    errors.push(
      'palette bridge is required. Declare what props to spread for each of: light, neutral, dark. ' +
      'This is the semantic handoff — MODE says "this section is dark"; you say what that means in your component.'
    );
  } else if (typeof declaration.palette !== "object" || Array.isArray(declaration.palette)) {
    errors.push('palette must be an object');
  } else {
    for (const mode of REQUIRED_PALETTE_MODES) {
      if (!declaration.palette[mode]) {
        errors.push(
          `palette.${mode} is required. Declare the external prop values that express ` +
          `${mode} emphasis in your component (e.g. { "theme": "${mode}" } or { "variant": "inverted" }).`
        );
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

module.exports = { validateDeclaration, SLOT_TYPES, REQUIRED_PALETTE_MODES };
