"use client";

import { useState } from "react";
import type { PresetData, AccentData, ResolvedColors } from "./page";

// ─── Palette map ────────────────────────────────────────────────────────────

const CYCLE: Record<string, string> = {
  light: "neutral",
  neutral: "dark",
  dark: "light",
};

const CELL: Record<string, { text: string; border: string }> = {
  light:   { text: "text-gray-700", border: "border border-gray-200" },
  neutral: { text: "text-gray-600", border: "border border-gray-200" },
  dark:    { text: "text-gray-300", border: "border border-gray-700" },
};

type PaletteMap = Record<string, string | Record<string, string>>;
type SaveState = "idle" | "saving" | "saved" | "error";

function deepEqual<T>(a: T, b: T) {
  return JSON.stringify(a) === JSON.stringify(b);
}

// ─── Accent preview ─────────────────────────────────────────────────────────

function AccentPreview({ bgHex, textHex, label }: { bgHex: string; textHex: string; label: string }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-gray-400">{label}</p>
      <div
        className="inline-flex items-center px-3 py-1.5 rounded text-xs font-medium"
        style={{ backgroundColor: bgHex, color: textHex }}
      >
        Get started
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function PaletteClient({
  presets,
  activePreset,
  accent: initialAccent,
  resolved,
}: {
  presets: PresetData[];
  activePreset: string;
  accent: AccentData;
  resolved: ResolvedColors;
}) {
  // Palette map state
  const [selectedKey, setSelectedKey] = useState(activePreset);
  const [maps, setMaps] = useState<Record<string, PaletteMap>>(
    Object.fromEntries(presets.map((p) => [p.key, structuredClone(p.paletteMap)]))
  );
  const [originals] = useState<Record<string, PaletteMap>>(
    Object.fromEntries(presets.map((p) => [p.key, structuredClone(p.paletteMap)]))
  );
  const [mapSaveState, setMapSaveState] = useState<SaveState>("idle");

  // Accent state
  const [accent, setAccent] = useState<AccentData>(structuredClone(initialAccent));
  const [originalAccent] = useState<AccentData>(structuredClone(initialAccent));
  const [accentSaveState, setAccentSaveState] = useState<SaveState>("idle");

  const preset = presets.find((p) => p.key === selectedKey) ?? presets[0];
  if (!preset) return null;

  const currentMap = maps[selectedKey];
  const mapHasChanges = !deepEqual(currentMap, originals[selectedKey]);
  const accentHasChanges = !deepEqual(accent, originalAccent);

  const components = Object.keys(preset.paletteMap);
  // Flat presets (component_role) have string values; nested have objects keyed by dimension.
  const isFlat = preset.isFlat;
  const dimensionValues = isFlat
    ? ["mode"]
    : components.length > 0
    ? Object.keys(preset.paletteMap[components[0]] as Record<string, string>)
    : [];

  function getMode(component: string, val: string): string {
    const entry = currentMap[component];
    if (isFlat) return (entry as string) ?? "light";
    return (entry as Record<string, string>)?.[val] ?? "light";
  }

  function handleCellClick(component: string, val: string) {
    const current = getMode(component, val);
    setMaps((prev) => {
      if (isFlat) {
        return { ...prev, [selectedKey]: { ...prev[selectedKey], [component]: CYCLE[current] ?? "light" } };
      }
      return {
        ...prev,
        [selectedKey]: {
          ...prev[selectedKey],
          [component]: { ...(prev[selectedKey][component] as Record<string, string>), [val]: CYCLE[current] ?? "light" },
        },
      };
    });
    setMapSaveState("idle");
  }

  function handleMapDiscard() {
    setMaps((prev) => ({ ...prev, [selectedKey]: structuredClone(originals[selectedKey]) }));
    setMapSaveState("idle");
  }

  async function handleMapSave() {
    setMapSaveState("saving");
    try {
      const res = await fetch("/api/palette", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset: selectedKey, paletteMap: currentMap }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMapSaveState("saved");
    } catch {
      setMapSaveState("error");
    }
  }

  function handleAccentChange(
    variant: "on_light" | "on_dark",
    field: "bg" | "text",
    value: string
  ) {
    setAccent((prev) => ({
      ...prev,
      [variant]: { ...prev[variant], [field]: value },
    }));
    setAccentSaveState("idle");
  }

  async function handleAccentSave() {
    setAccentSaveState("saving");
    try {
      const res = await fetch("/api/palette/accent", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accent }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAccentSaveState("saved");
    } catch {
      setAccentSaveState("error");
    }
  }

  return (
    <main>
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* ── Accent ───────────────────────────────────────────────────── */}
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Brand Accent</h2>
            <p className="text-sm text-gray-500 mt-1">
              Primary CTA color — global, not per-preset. Two variants: button on a light or neutral
              section vs. on a dark section.
            </p>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-100 px-5 py-3 flex items-center justify-between gap-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Accent tokens
              </p>
              <div className="flex items-center gap-3">
                {accentSaveState === "saved" && (
                  <p className="text-xs text-gray-400">Saved. Restart dev server to use in builds.</p>
                )}
                {accentSaveState === "error" && (
                  <p className="text-xs text-red-500">Save failed.</p>
                )}
                {accentHasChanges && accentSaveState !== "saved" && (
                  <>
                    <button
                      onClick={() => { setAccent(structuredClone(originalAccent)); setAccentSaveState("idle"); }}
                      className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      Discard
                    </button>
                    <button
                      onClick={handleAccentSave}
                      disabled={accentSaveState === "saving"}
                      className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                      {accentSaveState === "saving" ? "Saving…" : "Save accent"}
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="p-5 grid grid-cols-2 gap-6">
              {(["on_light", "on_dark"] as const).map((variant) => {
                const sectionBg = variant === "on_dark" ? "bg-gray-900" : "bg-white";
                const label = variant === "on_light" ? "On light / neutral sections" : "On dark sections";
                return (
                  <div key={variant} className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">{label}</p>
                    <div className={`rounded-lg p-4 space-y-3 ${sectionBg} border border-gray-200`}>
                      <AccentPreview
                        bgHex={resolved.accent[variant].bg}
                        textHex={resolved.accent[variant].text}
                        label="Preview"
                      />
                      <div className="space-y-2">
                        <label className="block text-xs text-gray-400">
                          bg
                          <input
                            type="text"
                            value={accent[variant].bg}
                            onChange={(e) => handleAccentChange(variant, "bg", e.target.value)}
                            className="mt-1 block w-full px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </label>
                        <label className="block text-xs text-gray-400">
                          text
                          <input
                            type="text"
                            value={accent[variant].text}
                            onChange={(e) => handleAccentChange(variant, "text", e.target.value)}
                            className="mt-1 block w-full px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Palette map ──────────────────────────────────────────────── */}
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Palette Map</h2>
            <p className="text-sm text-gray-500 mt-1">
              Which semantic weight each component carries per{" "}
              {preset.paletteKey.replace("_", " ")}. Click any cell to cycle light → neutral → dark.
            </p>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Preset tabs */}
            <div className="flex border-b border-gray-200 bg-gray-50 overflow-x-auto">
              {presets.map((p) => (
                <button
                  key={p.key}
                  onClick={() => { setSelectedKey(p.key); setMapSaveState("idle"); }}
                  className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-widest whitespace-nowrap transition-colors ${
                    p.key === selectedKey
                      ? "bg-white text-gray-900 border-b-2 border-indigo-600 -mb-px"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {p.key}
                </button>
              ))}
            </div>

            {/* Description + save bar */}
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between gap-4">
              <p className="text-xs text-gray-500">{preset.description}</p>
              <div className="flex items-center gap-3 flex-shrink-0">
                {mapSaveState === "saved" && (
                  <p className="text-xs text-gray-400">Saved. Restart dev server to use in builds.</p>
                )}
                {mapSaveState === "error" && (
                  <p className="text-xs text-red-500">Save failed.</p>
                )}
                {mapHasChanges && mapSaveState !== "saved" && (
                  <>
                    <button
                      onClick={handleMapDiscard}
                      className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      Discard
                    </button>
                    <button
                      onClick={handleMapSave}
                      disabled={mapSaveState === "saving"}
                      className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                      {mapSaveState === "saving" ? "Saving…" : "Save changes"}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Grid */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-widest text-gray-400 bg-gray-50 w-48 border-r border-gray-100">
                      Component
                    </th>
                    {dimensionValues.map((val) => (
                      <th key={val} className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-widest text-gray-400 bg-gray-50">
                        {val}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {components.map((component) => (
                    <tr key={component} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5 text-xs font-mono text-gray-600 bg-gray-50 border-r border-gray-100">
                        {component}
                      </td>
                      {dimensionValues.map((val) => {
                        const mode = getMode(component, val);
                        const original = isFlat
                          ? (originals[selectedKey][component] as string) ?? "light"
                          : (originals[selectedKey][component] as Record<string, string>)?.[val] ?? "light";
                        const changed = mode !== original;
                        const cellStyle = CELL[mode] ?? CELL.light;
                        const modeBgHex = resolved.modeBgs[mode as keyof typeof resolved.modeBgs] ?? "#ffffff";
                        return (
                          <td key={val} className="px-4 py-3.5 text-center">
                            <button
                              onClick={() => handleCellClick(component, val)}
                              title={`Click to cycle: ${CYCLE[mode]}`}
                              className={`inline-flex items-center justify-center w-20 h-7 rounded text-xs font-medium transition-opacity hover:opacity-80 cursor-pointer ${cellStyle.text} ${cellStyle.border} ${changed ? "ring-2 ring-indigo-400 ring-offset-1" : ""}`}
                              style={{ backgroundColor: modeBgHex }}
                            >
                              {mode}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
