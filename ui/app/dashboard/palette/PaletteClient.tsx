"use client";

import { useState } from "react";
import type { PresetData } from "./page";

const CELL: Record<string, { bg: string; text: string; border: string }> = {
  light:   { bg: "bg-white",   text: "text-gray-400", border: "border border-gray-200" },
  neutral: { bg: "bg-gray-100", text: "text-gray-500", border: "border border-gray-200" },
  dark:    { bg: "bg-gray-900", text: "text-gray-400", border: "border border-gray-700" },
};

export default function PaletteClient({
  presets,
  activePreset,
}: {
  presets: PresetData[];
  activePreset: string;
}) {
  const [selectedKey, setSelectedKey] = useState(activePreset);
  const preset = presets.find((p) => p.key === selectedKey) ?? presets[0];

  if (!preset) return null;

  const components = Object.keys(preset.paletteMap);
  const dimensionValues =
    components.length > 0 ? Object.keys(preset.paletteMap[components[0]]) : [];

  return (
    <main>
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Palette Map</h2>
          <p className="text-sm text-gray-500 mt-1">
            Which semantic weight each component carries per{" "}
            {preset.paletteKey.replace("_", " ")}. Light = low emphasis · Neutral = supporting ·
            Dark = high emphasis.
          </p>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {/* Preset tabs */}
          <div className="flex border-b border-gray-200 bg-gray-50 overflow-x-auto">
            {presets.map((p) => (
              <button
                key={p.key}
                onClick={() => setSelectedKey(p.key)}
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

          {/* Preset description */}
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-500">{preset.description}</p>
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
                      const mode = preset.paletteMap[component]?.[val] ?? "light";
                      const style = CELL[mode] ?? CELL.light;
                      return (
                        <td key={val} className="px-4 py-3.5 text-center">
                          <span
                            className={`inline-flex items-center justify-center w-20 h-7 rounded text-xs font-medium ${style.bg} ${style.text} ${style.border}`}
                          >
                            {mode}
                          </span>
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
