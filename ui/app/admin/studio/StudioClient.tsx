"use client";

import { useState } from "react";
import type { PageOutput, PageSection } from "@/lib/types";
import { MODULE_REGISTRY } from "@/components/modules";

// ── Types ───────────────────────────────────────────────────────────────────

type ColorScale = Record<string, unknown>;

/** A single component override for one section of one variant file. */
interface SectionOverride {
  component: string;
}

/** All overrides for one file: sectionIndex → override */
type FileOverrides = Record<number, SectionOverride>;

/** All overrides across all files: filename → FileOverrides */
type AllOverrides = Record<string, FileOverrides>;

export interface Variant {
  label: string;
  filename: string;
  output: PageOutput;
}

export interface StudioClientProps {
  variants: Variant[];
  initialColorScale: ColorScale;
  initialPaletteModes: Record<string, Record<string, string>>;
  initialAccent: Record<string, Record<string, string>>;
  buildTs: string | null;
}

// ── Constants ────────────────────────────────────────────────────────────────

const PALETTE_SLOTS = ["bg", "text", "subtext", "muted", "border", "iconBg"] as const;
type PaletteSlot = (typeof PALETTE_SLOTS)[number];

const SLOT_LABEL: Record<PaletteSlot, string> = {
  bg:      "Background",
  text:    "Text",
  subtext: "Subtext",
  muted:   "Muted",
  border:  "Border",
  iconBg:  "Icon bg",
};

const SLOT_CSS: Record<string, string> = {
  bg:      "bg",
  text:    "text",
  subtext: "subtext",
  muted:   "muted",
  border:  "border",
  iconBg:  "icon-bg",
};

const CARD_W = 280;
const CARD_H = 490;
const INNER_W = 1440;
const CARD_SCALE = CARD_W / INNER_W;

const MODE_BADGE: Record<string, string> = {
  light:   "bg-gray-100 text-gray-600",
  neutral: "bg-gray-200 text-gray-700",
  dark:    "bg-gray-800 text-gray-200",
};

// ── Utilities ─────────────────────────────────────────────────────────────────

function resolveRef(ref: string, scale: ColorScale): string {
  const dot = ref.indexOf(".");
  if (dot === -1) {
    const entry = scale[ref];
    return typeof entry === "string" ? entry : ref;
  }
  const hue = ref.slice(0, dot);
  const step = ref.slice(dot + 1);
  const hueScale = scale[hue];
  if (hueScale && typeof hueScale === "object") {
    return (hueScale as Record<string, string>)[step] ?? ref;
  }
  return ref;
}

function applyVar(varName: string, ref: string, scale: ColorScale) {
  document.documentElement.style.setProperty(varName, resolveRef(ref, scale));
}

/**
 * Re-apply every CSS var after the color scale changes.
 * 18 DOM writes max (3 modes × 6 slots + 2 accent variants × 2 slots).
 */
function reapplyAllVars(
  modes: Record<string, Record<string, string>>,
  accentTokens: Record<string, Record<string, string>>,
  scale: ColorScale,
) {
  for (const [mode, tokens] of Object.entries(modes)) {
    for (const slot of PALETTE_SLOTS) {
      const ref = tokens[slot];
      if (ref) applyVar(`--mode-${mode}-${SLOT_CSS[slot] ?? slot}`, ref, scale);
    }
  }
  for (const [variant, tokens] of Object.entries(accentTokens)) {
    const side = variant === "on_light" ? "light" : "dark";
    for (const slot of ["bg", "text"] as const) {
      const ref = tokens[slot];
      if (ref) applyVar(`--mode-accent-${side}-${slot}`, ref, scale);
    }
  }
}

/** "HeroPrimary" → "Hero Primary" */
function formatComponentName(name: string): string {
  return name.replace(/([A-Z])/g, " $1").trim();
}

/** Apply a set of component overrides to the in-memory variant list. */
function applyOverridesToVariants(variants: Variant[], overrides: AllOverrides): Variant[] {
  return variants.map((v) => {
    const fileOverrides = overrides[v.filename];
    if (!fileOverrides || Object.keys(fileOverrides).length === 0) return v;
    const updatedPage = v.output.page.map((section, i) => {
      const ov = fileOverrides[i];
      return ov ? { ...section, component: ov.component } : section;
    });
    return { ...v, output: { ...v.output, page: updatedPage } };
  });
}

// ── StudioPreview — birds-eye static render (no interactivity) ───────────────

function StudioPreview({ output }: { output: PageOutput }) {
  return (
    <main className="min-h-screen bg-white">
      {output.page.map((section, i) => {
        const Component = MODULE_REGISTRY[section.component];
        return Component ? (
          <div key={i}>
            <Component
              slots={section.slots}
              variant={section.variant}
              palette={section.palette}
            />
          </div>
        ) : null;
      })}
    </main>
  );
}

// ── ComponentSelectorBar — hover overlay for component swapping ──────────────

function ComponentSelectorBar({
  current,
  candidates,
  onSelect,
}: {
  current: string;
  candidates: string[];
  onSelect: (name: string) => void;
}) {
  return (
    <div className="absolute inset-x-0 top-0 z-20 bg-gray-900/88 backdrop-blur-sm px-4 py-2.5 flex items-center gap-2 flex-wrap">
      <span className="text-[9px] font-mono uppercase tracking-widest text-gray-400 mr-1 shrink-0">
        component
      </span>
      {candidates.map((name) => (
        <button
          key={name}
          onClick={() => onSelect(name)}
          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
            name === current
              ? "bg-white text-gray-900"
              : "bg-white/10 text-gray-200 hover:bg-white/20"
          }`}
        >
          {formatComponentName(name)}
        </button>
      ))}
    </div>
  );
}

// ── InteractiveSection — one section with hover swap overlay ─────────────────

function InteractiveSection({
  index,
  section,
  override,
  candidates,
  onSelectComponent,
}: {
  index: number;
  section: PageSection;
  override: SectionOverride | undefined;
  candidates: string[];
  onSelectComponent: (idx: number, name: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const effectiveComponent = override?.component ?? section.component;
  const Component = MODULE_REGISTRY[effectiveComponent];

  // Only show selector if there's more than one valid candidate in the registry
  const validCandidates = candidates.filter((c) => MODULE_REGISTRY[c]);
  const hasAlternatives = validCandidates.length > 1;

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {hovered && hasAlternatives && (
        <ComponentSelectorBar
          current={effectiveComponent}
          candidates={validCandidates}
          onSelect={(name) => onSelectComponent(index, name)}
        />
      )}
      {Component ? (
        <Component
          slots={section.slots}
          variant={section.variant}
          palette={section.palette}
        />
      ) : (
        <div className="mx-auto my-4 max-w-6xl px-6">
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Unknown component: <code className="font-mono font-semibold">{effectiveComponent}</code>
          </div>
        </div>
      )}
    </div>
  );
}

// ── InteractivePreview — expanded mode render with component swapping ─────────

function InteractivePreview({
  output,
  overrides,
  onSelectComponent,
}: {
  output: PageOutput;
  overrides: FileOverrides;
  onSelectComponent: (sectionIndex: number, component: string) => void;
}) {
  // Build candidates map from IA output: sectionName → candidate_components[]
  const candidatesMap = Object.fromEntries(
    output.ia.sections.map((s) => [s.name, s.candidate_components ?? []])
  );

  return (
    <main className="min-h-screen bg-white">
      {output.page.map((section, i) => {
        const candidates = candidatesMap[section.section] ?? [section.component];
        return (
          <InteractiveSection
            key={i}
            index={i}
            section={section}
            override={overrides[i]}
            candidates={candidates}
            onSelectComponent={onSelectComponent}
          />
        );
      })}
    </main>
  );
}

// ── ColorPicker ───────────────────────────────────────────────────────────────

function ColorPicker({
  currentRef,
  scale,
  onSelect,
}: {
  currentRef: string;
  scale: ColorScale;
  onSelect: (ref: string) => void;
}) {
  const topLevel = Object.entries(scale).filter(
    ([k, v]) => !k.startsWith("_") && typeof v === "string"
  ) as [string, string][];

  const groups = Object.entries(scale).filter(
    ([k, v]) => !k.startsWith("_") && typeof v === "object" && v !== null
  ) as [string, Record<string, string>][];

  return (
    <div className="mt-1 p-2 rounded-md border border-gray-200 bg-gray-50 space-y-1.5">
      {topLevel.length > 0 && (
        <div className="flex gap-1.5">
          {topLevel.map(([key, hex]) => (
            <button
              key={key}
              title={key}
              onClick={() => onSelect(key)}
              style={{ backgroundColor: hex }}
              className={`w-6 h-6 rounded border-2 transition-all ${
                currentRef === key
                  ? "border-indigo-500 ring-1 ring-indigo-400"
                  : "border-gray-300 hover:border-gray-500"
              }`}
            />
          ))}
        </div>
      )}
      {groups.map(([hue, steps]) => (
        <div key={hue} className="flex items-center gap-1">
          <span className="text-[9px] font-mono text-gray-400 w-10 shrink-0">{hue}</span>
          <div className="flex gap-0.5 flex-wrap">
            {Object.entries(steps).map(([step, hex]) => {
              const ref = `${hue}.${step}`;
              return (
                <button
                  key={ref}
                  title={ref}
                  onClick={() => onSelect(ref)}
                  style={{ backgroundColor: hex }}
                  className={`w-5 h-5 rounded border transition-all ${
                    currentRef === ref
                      ? "border-indigo-500 ring-1 ring-indigo-300 ring-offset-1"
                      : "border-transparent hover:border-gray-300"
                  }`}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── TokenRow ──────────────────────────────────────────────────────────────────

function TokenRow({
  rowKey,
  label,
  currentRef,
  scale,
  open,
  onToggle,
  onSelect,
}: {
  rowKey: string;
  label: string;
  currentRef: string;
  scale: ColorScale;
  open: boolean;
  onToggle: () => void;
  onSelect: (ref: string) => void;
}) {
  const resolved = resolveRef(currentRef, scale);
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 transition-colors text-left"
      >
        <span
          className="w-4 h-4 rounded border border-gray-300 shrink-0 shadow-sm"
          style={{ backgroundColor: resolved }}
        />
        <span className="text-xs text-gray-500 w-[72px] shrink-0">{label}</span>
        <span className="text-xs font-mono text-gray-700 flex-1 truncate">{currentRef}</span>
        <span className="text-[10px] text-gray-300">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="px-2 pb-2">
          <ColorPicker currentRef={currentRef} scale={scale} onSelect={onSelect} />
        </div>
      )}
    </div>
  );
}

// ── ModeSection ───────────────────────────────────────────────────────────────

function ModeSection({
  mode,
  tokens,
  scale,
  openKey,
  onToggleKey,
  onSetToken,
}: {
  mode: string;
  tokens: Record<string, string>;
  scale: ColorScale;
  openKey: string | null;
  onToggleKey: (key: string) => void;
  onSetToken: (slot: string, ref: string) => void;
}) {
  return (
    <div className="py-2">
      <div className="flex items-center gap-2 px-2 pb-1">
        <span
          className={`text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded ${MODE_BADGE[mode] ?? "bg-gray-100 text-gray-600"}`}
        >
          {mode}
        </span>
        {tokens["_description"] && (
          <span className="text-[10px] text-gray-400 truncate">{tokens["_description"]}</span>
        )}
      </div>
      {PALETTE_SLOTS.map((slot) => {
        const rowKey = `${mode}.${slot}`;
        return (
          <TokenRow
            key={slot}
            rowKey={rowKey}
            label={SLOT_LABEL[slot]}
            currentRef={tokens[slot] ?? ""}
            scale={scale}
            open={openKey === rowKey}
            onToggle={() => onToggleKey(rowKey)}
            onSelect={(ref) => onSetToken(slot, ref)}
          />
        );
      })}
    </div>
  );
}

// ── AccentSection ─────────────────────────────────────────────────────────────

function AccentSection({
  accent,
  scale,
  openKey,
  onToggleKey,
  onSetAccentToken,
}: {
  accent: Record<string, Record<string, string>>;
  scale: ColorScale;
  openKey: string | null;
  onToggleKey: (key: string) => void;
  onSetAccentToken: (variant: string, slot: string, ref: string) => void;
}) {
  const ACCENT_VARIANTS = [
    { key: "on_light", label: "On light / neutral" },
    { key: "on_dark",  label: "On dark" },
  ];
  return (
    <div className="py-2">
      <div className="px-2 pb-1">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-indigo-600">
          Accent
        </span>
      </div>
      {ACCENT_VARIANTS.map(({ key, label }) => (
        <div key={key}>
          <p className="text-[10px] text-gray-400 px-2 pt-1 pb-0.5">{label}</p>
          {["bg", "text"].map((slot) => {
            const rowKey = `accent.${key}.${slot}`;
            return (
              <TokenRow
                key={slot}
                rowKey={rowKey}
                label={slot === "bg" ? "Background" : "Text"}
                currentRef={accent[key]?.[slot] ?? ""}
                scale={scale}
                open={openKey === rowKey}
                onToggle={() => onToggleKey(rowKey)}
                onSelect={(ref) => onSetAccentToken(key, slot, ref)}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── TokenPanel ────────────────────────────────────────────────────────────────

function TokenPanel({
  paletteModes,
  accent,
  scale,
  openKey,
  onToggleKey,
  onSetToken,
  onSetAccentToken,
  saveState,
  dirty,
  onSave,
}: {
  paletteModes: Record<string, Record<string, string>>;
  accent: Record<string, Record<string, string>>;
  scale: ColorScale;
  openKey: string | null;
  onToggleKey: (key: string) => void;
  onSetToken: (mode: string, slot: string, ref: string) => void;
  onSetAccentToken: (variant: string, slot: string, ref: string) => void;
  saveState: "idle" | "saving" | "saved" | "error";
  dirty: boolean;
  onSave: () => void;
}) {
  return (
    <div className="w-[272px] shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-hidden">
      <div className="shrink-0 px-3 py-2.5 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-xs font-semibold text-gray-700">Theme tokens</h2>
        <button
          onClick={onSave}
          disabled={!dirty || saveState === "saving"}
          className={`rounded px-2.5 py-1 text-[10px] font-semibold transition-colors disabled:opacity-40 ${
            saveState === "saved"
              ? "bg-green-600 text-white"
              : "bg-gray-900 text-white hover:bg-gray-700"
          }`}
        >
          {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved ✓" : "Save"}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
        {["light", "neutral", "dark"].map((mode) => (
          <ModeSection
            key={mode}
            mode={mode}
            tokens={paletteModes[mode] ?? {}}
            scale={scale}
            openKey={openKey}
            onToggleKey={onToggleKey}
            onSetToken={(slot, ref) => onSetToken(mode, slot, ref)}
          />
        ))}
        <AccentSection
          accent={accent}
          scale={scale}
          openKey={openKey}
          onToggleKey={onToggleKey}
          onSetAccentToken={onSetAccentToken}
        />
        {saveState === "error" && (
          <p className="px-3 py-2 text-xs text-red-600">Save failed — check console</p>
        )}
      </div>
    </div>
  );
}

// ── VariantCard — birds-eye canvas card ───────────────────────────────────────

function VariantCard({
  variant,
  active,
  onClick,
}: {
  variant: Variant;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="flex flex-col gap-2.5 text-left group shrink-0">
      <div
        className={`rounded-xl overflow-hidden border-2 transition-colors ${
          active
            ? "border-indigo-500 shadow-md"
            : "border-gray-200 group-hover:border-gray-400 group-hover:shadow-sm"
        }`}
        style={{ width: CARD_W, height: CARD_H }}
      >
        <div
          style={{
            width: INNER_W,
            transform: `scale(${CARD_SCALE})`,
            transformOrigin: "top left",
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          <StudioPreview output={variant.output} />
        </div>
      </div>
      <div className="px-0.5">
        <p
          className={`text-sm font-medium ${
            active ? "text-indigo-600" : "text-gray-800 group-hover:text-gray-900"
          }`}
        >
          {variant.label}
        </p>
        <p className="text-[11px] text-gray-400 mt-0.5">
          {variant.output.brief.archetype} · {variant.output.brief.funnel_stage}
        </p>
      </div>
    </button>
  );
}

// ── BirdsEyeView ──────────────────────────────────────────────────────────────

function BirdsEyeView({
  variants,
  activeIdx,
  onSelect,
}: {
  variants: Variant[];
  activeIdx: number;
  onSelect: (idx: number) => void;
}) {
  return (
    <div className="flex-1 overflow-auto">
      <div className="flex items-start gap-8 px-12 py-10">
        {variants.map((v, i) => (
          <VariantCard
            key={v.filename}
            variant={v}
            active={i === activeIdx}
            onClick={() => onSelect(i)}
          />
        ))}
      </div>
    </div>
  );
}

// ── ExpandedView ──────────────────────────────────────────────────────────────

function ExpandedView({
  variants,
  activeIdx,
  overrides,
  onSelectVariant,
  onSelectComponent,
  paletteModes,
  accent,
  scale,
  openKey,
  onToggleKey,
  onSetToken,
  onSetAccentToken,
  saveState,
  dirty,
  onSave,
}: {
  variants: Variant[];
  activeIdx: number;
  overrides: AllOverrides;
  onSelectVariant: (idx: number) => void;
  onSelectComponent: (filename: string, sectionIndex: number, component: string) => void;
  paletteModes: Record<string, Record<string, string>>;
  accent: Record<string, Record<string, string>>;
  scale: ColorScale;
  openKey: string | null;
  onToggleKey: (key: string) => void;
  onSetToken: (mode: string, slot: string, ref: string) => void;
  onSetAccentToken: (variant: string, slot: string, ref: string) => void;
  saveState: "idle" | "saving" | "saved" | "error";
  dirty: boolean;
  onSave: () => void;
}) {
  const active = variants[activeIdx];
  const fileOverrides = active ? (overrides[active.filename] ?? {}) : {};

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Scrollable page preview */}
      <div className="flex-1 overflow-y-auto bg-gray-100">
        {/* Variant tab strip */}
        {variants.length > 1 && (
          <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200 px-4 py-2 flex gap-2">
            {variants.map((v, i) => {
              const hasOverrides =
                overrides[v.filename] &&
                Object.keys(overrides[v.filename]).length > 0;
              return (
                <button
                  key={v.filename}
                  onClick={() => onSelectVariant(i)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
                    i === activeIdx
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {v.label}
                  {hasOverrides && (
                    <span className={`w-1.5 h-1.5 rounded-full ${i === activeIdx ? "bg-white/60" : "bg-amber-400"}`} />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Page content with component swap overlays */}
        {active && (
          <div className="bg-white shadow-lg mx-auto" style={{ maxWidth: 1440 }}>
            <InteractivePreview
              output={active.output}
              overrides={fileOverrides}
              onSelectComponent={(sectionIndex, component) =>
                onSelectComponent(active.filename, sectionIndex, component)
              }
            />
          </div>
        )}
      </div>

      {/* Token panel */}
      <TokenPanel
        paletteModes={paletteModes}
        accent={accent}
        scale={scale}
        openKey={openKey}
        onToggleKey={onToggleKey}
        onSetToken={onSetToken}
        onSetAccentToken={onSetAccentToken}
        saveState={saveState}
        dirty={dirty}
        onSave={onSave}
      />
    </div>
  );
}

// ── Design System Editor ──────────────────────────────────────────────────────

function ScaleHueCard({
  hue,
  value,
  onChange,
}: {
  hue: string;
  value: string | Record<string, string>;
  onChange: (hue: string, step: string | null, hex: string) => void;
}) {
  if (typeof value === "string") {
    // Top-level entry: white, black
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="h-10" style={{ backgroundColor: value }} />
        <div className="px-3 py-2.5 flex items-center gap-2.5">
          <span className="text-[10px] font-mono font-semibold uppercase tracking-widest text-gray-500 w-10 shrink-0">
            {hue}
          </span>
          <label className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer">
            <span
              className="w-4 h-4 rounded border border-gray-200 shrink-0"
              style={{ backgroundColor: value }}
            />
            <input
              type="color"
              value={value}
              onChange={(e) => onChange(hue, null, e.target.value)}
              className="sr-only"
            />
            <span className="text-xs font-mono text-gray-600 truncate">{value}</span>
          </label>
        </div>
      </div>
    );
  }

  // Hue group: gray, indigo, etc.
  const steps = Object.entries(value);
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Color ramp */}
      <div className="flex h-10">
        {steps.map(([step, hex]) => (
          <div key={step} style={{ backgroundColor: hex, flex: 1 }} title={`${hue}.${step}`} />
        ))}
      </div>
      {/* Steps */}
      <div className="px-3 pt-2.5 pb-3 space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">{hue}</p>
        {steps.map(([step, hex]) => (
          <label key={step} className="flex items-center gap-2.5 cursor-pointer group">
            <span className="text-[11px] font-mono text-gray-400 w-7 shrink-0 text-right">{step}</span>
            <div className="relative shrink-0">
              <div
                className="w-5 h-5 rounded border border-gray-200 group-hover:border-gray-400 transition-colors"
                style={{ backgroundColor: hex }}
              />
              <input
                type="color"
                value={hex}
                onChange={(e) => onChange(hue, step, e.target.value)}
                className="absolute inset-0 opacity-0 w-5 h-5 cursor-pointer"
              />
            </div>
            <span className="text-xs font-mono text-gray-600 flex-1 min-w-0 truncate">{hex}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function DesignSystemView({
  colorScale,
  onChange,
  saveState,
  dirty,
  onSave,
}: {
  colorScale: ColorScale;
  onChange: (hue: string, step: string | null, hex: string) => void;
  saveState: "idle" | "saving" | "saved" | "error";
  dirty: boolean;
  onSave: () => void;
}) {
  const entries = Object.entries(colorScale).filter(([k]) => !k.startsWith("_")) as [
    string,
    string | Record<string, string>,
  ][];

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="max-w-5xl mx-auto px-10 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Color Scale</h2>
            <p className="text-xs text-gray-400 mt-1">
              The brand&rsquo;s color vocabulary.{" "}
              <span className="font-mono">theme.json</span> references these via dot notation
              (e.g. <span className="font-mono">gray.900</span>). Changes apply live across all
              rendered variants. Click any swatch to edit.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {saveState === "error" && (
              <span className="text-xs text-red-600">Save failed</span>
            )}
            <button
              onClick={onSave}
              disabled={!dirty || saveState === "saving"}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40 ${
                saveState === "saved"
                  ? "bg-green-600 text-white"
                  : "bg-gray-900 text-white hover:bg-gray-700"
              }`}
            >
              {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved ✓" : "Save scale"}
            </button>
          </div>
        </div>

        {/* Cards grid */}
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
          {entries.map(([hue, value]) => (
            <ScaleHueCard key={hue} hue={hue} value={value} onChange={onChange} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── NoVariants ────────────────────────────────────────────────────────────────

function NoVariants({ buildTs }: { buildTs: string | null }) {
  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center gap-3 text-center px-6">
      <p className="text-sm font-medium text-gray-700">No variants to display</p>
      <p className="text-xs text-gray-400 max-w-xs">
        {buildTs
          ? "Couldn't load the active build's variants. Try generating and activating a new build."
          : "No active build. Generate a multi-variant build and activate it first."}
      </p>
      <div className="flex gap-4 mt-2">
        <a href="/admin/build" className="text-xs text-indigo-600 hover:text-indigo-800">
          Build tab →
        </a>
        <a href="/admin" className="text-xs text-gray-400 hover:text-gray-600">
          ← Dashboard
        </a>
      </div>
    </div>
  );
}

// ── StudioClient ──────────────────────────────────────────────────────────────

export function StudioClient({
  variants,
  initialColorScale,
  initialPaletteModes,
  initialAccent,
  buildTs,
}: StudioClientProps) {
  // activeVariants starts from server data; updated in-memory after saves so
  // the display stays consistent without a page reload.
  const [activeVariants, setActiveVariants] = useState<Variant[]>(variants);
  const [view, setView] = useState<"birds-eye" | "expanded" | "design-system">("birds-eye");
  const [activeIdx, setActiveIdx] = useState(0);

  // Token state
  const [paletteModes, setPaletteModes] = useState(initialPaletteModes);
  const [accent, setAccent] = useState(initialAccent);

  // Color scale state — mutable so design system edits flow live into CSS vars
  const [colorScale, setColorScale] = useState<ColorScale>(initialColorScale);
  const [scaleDirty, setScaleDirty] = useState(false);
  const [scaleSaveState, setScaleSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Component override state: filename → sectionIndex → { component }
  const [overrides, setOverrides] = useState<AllOverrides>({});

  // Save / dirty state
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Token panel open row
  const [openKey, setOpenKey] = useState<string | null>(null);

  if (activeVariants.length === 0) {
    return <NoVariants buildTs={buildTs} />;
  }

  // ── Handlers ──

  function handleToggleKey(key: string) {
    setOpenKey((prev) => (prev === key ? null : key));
  }

  function handleSetToken(mode: string, slot: string, ref: string) {
    setPaletteModes((prev) => ({
      ...prev,
      [mode]: { ...prev[mode], [slot]: ref },
    }));
    setDirty(true);
    applyVar(`--mode-${mode}-${SLOT_CSS[slot] ?? slot}`, ref, colorScale);
  }

  function handleSetAccentToken(variant: string, slot: string, ref: string) {
    setAccent((prev) => ({
      ...prev,
      [variant]: { ...prev[variant], [slot]: ref },
    }));
    setDirty(true);
    const side = variant === "on_light" ? "light" : "dark";
    applyVar(`--mode-accent-${side}-${slot}`, ref, colorScale);
  }

  function handleSetComponentOverride(
    filename: string,
    sectionIndex: number,
    component: string,
  ) {
    setOverrides((prev) => ({
      ...prev,
      [filename]: {
        ...(prev[filename] ?? {}),
        [sectionIndex]: { component },
      },
    }));
    setDirty(true);
  }

  async function handleSave() {
    setSaveState("saving");
    try {
      // 1. Save token assignments to theme.json
      if (paletteModes || accent) {
        const res = await fetch("/api/tokens/theme", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ palette_modes: paletteModes, accent }),
        });
        if (!res.ok) throw new Error("Token save failed");
      }

      // 2. Save component overrides to each output file
      for (const [filename, fileOverrides] of Object.entries(overrides)) {
        for (const [indexStr, override] of Object.entries(fileOverrides)) {
          const res = await fetch("/api/output/save", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              file: filename,
              sectionIndex: parseInt(indexStr, 10),
              component: override.component,
            }),
          });
          if (!res.ok) throw new Error(`Component save failed for ${filename}`);
        }
      }

      // Reflect saved overrides in in-memory variant state so display stays
      // correct without a page reload, then clear the override delta.
      if (Object.keys(overrides).length > 0) {
        setActiveVariants((prev) => applyOverridesToVariants(prev, overrides));
        setOverrides({});
      }

      setSaveState("saved");
      setDirty(false);
      setTimeout(() => setSaveState("idle"), 2500);
    } catch {
      setSaveState("error");
    }
  }

  function enterExpanded(idx: number) {
    setActiveIdx(idx);
    setView("expanded");
  }

  function handleScaleChange(hue: string, step: string | null, hex: string) {
    const next: ColorScale =
      step === null
        ? { ...colorScale, [hue]: hex }
        : {
            ...colorScale,
            [hue]: {
              ...((colorScale[hue] as Record<string, string>) ?? {}),
              [step]: hex,
            },
          };
    setColorScale(next);
    setScaleDirty(true);
    reapplyAllVars(paletteModes, accent, next);
  }

  async function handleScaleSave() {
    setScaleSaveState("saving");
    try {
      const toSave = Object.fromEntries(
        Object.entries(colorScale).filter(([k]) => !k.startsWith("_"))
      );
      const res = await fetch("/api/tokens/color-scale", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSave),
      });
      if (!res.ok) throw new Error("Scale save failed");
      setScaleSaveState("saved");
      setScaleDirty(false);
      setTimeout(() => setScaleSaveState("idle"), 2500);
    } catch {
      setScaleSaveState("error");
    }
  }

  // ── Render ──

  return (
    <div className="fixed inset-0 z-50 bg-gray-100 flex flex-col">
      {/* Studio header */}
      <div className="shrink-0 bg-white border-b border-gray-200 px-5 py-3 flex items-center gap-3">
        {/* Back arrow — only in expanded canvas */}
        {view === "expanded" && (
          <button
            onClick={() => setView("birds-eye")}
            className="text-gray-400 hover:text-gray-700 transition-colors text-sm shrink-0"
            aria-label="Back to birds-eye"
          >
            ←
          </button>
        )}

        {/* Canvas / Design System toggle */}
        <div className="flex items-center rounded-md border border-gray-200 overflow-hidden text-[11px] font-semibold shrink-0">
          <button
            onClick={() => { if (view === "design-system") setView("birds-eye"); }}
            className={`px-3 py-1.5 transition-colors ${
              view !== "design-system"
                ? "bg-gray-900 text-white"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Canvas
          </button>
          <button
            onClick={() => setView("design-system")}
            className={`px-3 py-1.5 transition-colors border-l border-gray-200 ${
              view === "design-system"
                ? "bg-gray-900 text-white"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Design System
          </button>
        </div>

        {/* Variant label in expanded mode */}
        {view === "expanded" && activeVariants[activeIdx] && (
          <span className="text-xs text-gray-400 truncate">{activeVariants[activeIdx].label}</span>
        )}

        <div className="flex-1" />

        {(dirty || scaleDirty) && (
          <span className="text-xs text-amber-600 font-medium shrink-0">Unsaved changes</span>
        )}
        <a
          href="/admin"
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors shrink-0"
        >
          ← Dashboard
        </a>
      </div>

      {/* Content */}
      {view === "design-system" ? (
        <DesignSystemView
          colorScale={colorScale}
          onChange={handleScaleChange}
          saveState={scaleSaveState}
          dirty={scaleDirty}
          onSave={handleScaleSave}
        />
      ) : view === "birds-eye" ? (
        <BirdsEyeView
          variants={activeVariants}
          activeIdx={activeIdx}
          onSelect={enterExpanded}
        />
      ) : (
        <ExpandedView
          variants={activeVariants}
          activeIdx={activeIdx}
          overrides={overrides}
          onSelectVariant={setActiveIdx}
          onSelectComponent={handleSetComponentOverride}
          paletteModes={paletteModes}
          accent={accent}
          scale={colorScale}
          openKey={openKey}
          onToggleKey={handleToggleKey}
          onSetToken={handleSetToken}
          onSetAccentToken={handleSetAccentToken}
          saveState={saveState}
          dirty={dirty}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
