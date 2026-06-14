"use client";

/**
 * PreviewClient — client wrapper for the preview page.
 *
 * Owns the label toggle state. Renders each section with an optional
 * SectionLabel above it when labels are on. The server component handles
 * data fetching; this component handles all interactivity.
 */

import { useState } from "react";
import type { PageOutput, PageSection } from "@/lib/types";
import { MODULE_REGISTRY } from "@/components/modules";
import { SectionLabel } from "./SectionLabel";

function UnknownComponent({ name }: { name: string }) {
  return (
    <div className="mx-auto my-4 max-w-6xl px-6">
      <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Unknown component: <code className="font-mono font-semibold">{name}</code> — not in registry
      </div>
    </div>
  );
}

interface PreviewClientProps {
  output: PageOutput;
}

export function PreviewClient({ output }: PreviewClientProps) {
  const [labelsOn, setLabelsOn] = useState(false);

  // Index IA rationale by section name for O(1) lookup
  const rationaleMap = Object.fromEntries(
    output.ia.sections.map((s) => [s.name, s.rationale])
  );

  return (
    <>
      <main className="min-h-screen bg-white">
        {output.page.map((section: PageSection, i: number) => {
          const Component = MODULE_REGISTRY[section.component];

          return (
            <div key={i}>
              {labelsOn && (
                <SectionLabel
                  sectionName={section.section}
                  component={section.component}
                  variant={section.variant}
                  reasoning={section.reasoning}
                  rationale={rationaleMap[section.section] ?? null}
                  archetype={output.brief.archetype}
                  funnel_stage={output.brief.funnel_stage}
                />
              )}
              {Component ? (
                <Component slots={section.slots} variant={section.variant} palette={section.palette} />
              ) : (
                <UnknownComponent name={section.component} />
              )}
            </div>
          );
        })}
      </main>

      {/* Dev tools — fixed overlay, never shown in production builds */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
        <button
          onClick={() => setLabelsOn((v) => !v)}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm transition-colors ${
            labelsOn
              ? "border-gray-700 bg-gray-900 text-white"
              : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700"
          }`}
        >
          {labelsOn ? "◉ Labels on" : "○ Labels"}
        </button>

        <div className="rounded-lg border border-gray-200 bg-white/90 px-4 py-2.5 font-mono text-xs text-gray-500 shadow-sm backdrop-blur-sm">
          <span className="font-semibold text-gray-700">{output.brief.archetype}</span>
          {" · "}
          <span>{output.brief.funnel_stage}</span>
          {" · "}
          <span>{new Date(output.generated_at).toLocaleDateString()}</span>
        </div>
      </div>
    </>
  );
}
