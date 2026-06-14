"use client";

import { useState, useCallback } from "react";
import type { PresetData } from "./page";

const CYCLE: Record<string, string> = {
  light: "neutral",
  neutral: "dark",
  dark: "light",
};

const CELL: Record<string, { bg: string; text: string; border: string }> = {
  light:   { bg: "bg-white",    text: "text-gray-400", border: "border border-gray-200" },
  neutral: { bg: "bg-gray-100", text: "text-gray-500", border: "border border-gray-200" },
  dark:    { bg: "bg-gray-900", text: "text-gray-400", border: "border border-gray-700" },
};

type PaletteMap = Record<string, Record<string, string>>;
type SaveState = "idle" | "saving" | "saved" | "error";

function deepEqual(a: PaletteMap, b: PaletteMap) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export default function PaletteClient({
  presets,
  activePreset,
}: {
  presets: PresetData[];
  activePreset: string;
}) {
  const [selectedKey, setSelectedKey] = useState(activePreset);
  const [maps, setMaps] = useState<Record<string, PaletteMap>>(
    Object.fromEntries(presets.map((p) => [p.key, structuredClone(p.paletteMap)]))
  );
  const [originals] = useState<Record<string, PaletteMap>>(
    Object.fromEntries(presets.map((p) => [p.key, structuredClone(p.paletteMap)]))
  );
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const preset = presets.find((p) => p.key === selectedKey) ?? presets[0];
  if (!preset) return null;

  const currentMap = maps[selectedKey];
  const hasChanges = !deepEqual(currentMap, originals[selectedKey]);

  const components = Object.keys(preset.paletteMap);
  const dimensionValues =
    components.length > 0 ? Object.keys(preset.paletteMap[components[0]]) : [];

  function handleCellClick(component: string, val: string) {
    const current = currentMap[component]?.[val] ?? "light";
    const next = CYCLE[current] ?? "light";
    setMaps((prev) => ({
      ...prev,
      [selectedKey]: {
        ...prev[selectedKey],
        [component]: {
          ...prev[selectedKey][component],
          [val]: next,
        },
      },
    }));
    setSaveState("idle");
  }

  function handleDiscard() {
    setMaps((prev) => ({
      ...prev,
      [selectedKey]: structuredClone(originals[selectedKey]),
    }));
    setSaveState("idle");
  }

  async function handleSave() {
    setSaveState("saving");
    try {
      const res = await fetch("/api/palette", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset: selectedKey, paletteMap: currentMap }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  return (
    <main>
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
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
                onClick={() => {
                  setSelectedKey(p.key);
                  setSaveState("idle");
                }}
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
              {saveState === "saved" && (
                <p className="text-xs text-gray-400">
                  Saved. Restart the dev server for changes to take effect in builds.
                </p>
              )}
              {saveState === "error" && (
                <p className="text-xs text-red-500">Save failed — check console.</p>
              )}
              {hasChanges && saveState !== "saved" && (
                <>
                  <button
                    onClick={handleDiscard}
                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    Discard
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saveState === "saving"}
                    className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {saveState === "saving" ? "Saving…" : "Save changes"}
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
                    <th
                      key={val}
                      className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-widest text-gray-400 bg-gray-50"
                    >
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
                      const mode = currentMap[component]?.[val] ?? "light";
                      const original = originals[selectedKey][component]?.[val] ?? "light";
                      const changed = mode !== original;
                      const style = CELL[mode] ?? CELL.light;
                      return (
                        <td key={val} className="px-4 py-3.5 text-center">
                          <button
                            onClick={() => handleCellClick(component, val)}
                            title={`Click to cycle: ${CYCLE[mode]}`}
                            className={`inline-flex items-center justify-center w-20 h-7 rounded text-xs font-medium transition-opacity hover:opacity-80 cursor-pointer ${style.bg} ${style.text} ${style.border} ${changed ? "ring-2 ring-indigo-400 ring-offset-1" : ""}`}
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
    </main>
  );
}
