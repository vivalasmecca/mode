import * as fs from "fs";
import * as path from "path";
import { DATA_ROOT, getSiteManifest } from "@/lib/get-output";
import { getRecentEvents, type RoutingEvent } from "@/lib/log-event";
import { RunClient } from "./RunClient";

export const dynamic = "force-dynamic";

function getActiveBuildTs(): string | null {
  try {
    const filepath = path.join(DATA_ROOT, "config", "routing.json");
    if (!fs.existsSync(filepath)) return null;
    const data = JSON.parse(fs.readFileSync(filepath, "utf8")) as { ts?: string };
    return typeof data.ts === "string" && data.ts ? data.ts : null;
  } catch {
    return null;
  }
}

// ─── Reference doc sub-components ────────────────────────────────────────────

function Cmd({ children }: { children: string }) {
  return (
    <code className="block bg-gray-900 text-gray-100 font-mono text-sm px-4 py-3 rounded">
      {children}
    </code>
  );
}

function Step({
  n,
  label,
  children,
}: {
  n: number;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <span className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold flex items-center justify-center">
        {n}
      </span>
      <div className="space-y-2 flex-1">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {children}
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">{title}</h2>
      </div>
      <div className="p-6 space-y-6">{children}</div>
    </section>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-gray-400 leading-relaxed">{children}</p>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function RunPage() {
  const activeBuildTs = getActiveBuildTs();
  const variantLabels: string[] = activeBuildTs
    ? (getSiteManifest(activeBuildTs)?.pages.map((p) => p.label) ?? [])
    : [];
  const recentEvents: RoutingEvent[] = getRecentEvents(50);

  return (
    <main>
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">

        {/* Deploy panel */}
        <RunClient activeBuildTs={activeBuildTs} variantLabels={variantLabels} recentEvents={recentEvents} />

        {/* Launch */}
        <Group title="Launch — start the system from scratch">
          <Step n={1} label="Start the preview UI">
            <Cmd>cd ~/GitHub/mode/ui && npm run dev</Cmd>
            <Note>
              Starts the Next.js dev server. Preview at localhost:3001/preview · Dashboard at
              localhost:3001/dashboard. Keep this running in the background.
            </Note>
          </Step>

          <Step n={2} label="Run the agent">
            <Cmd>cd ~/GitHub/mode && node agent/page-builder.js</Cmd>
            <Note>
              Must be run from mode/ — not mode/ui/. Uses the test brief hardcoded at the bottom
              of agent/page-builder.js (Validator · decision · organic by default). The agent will
              pause and ask you to approve the IA.
            </Note>
          </Step>

          <Step n={3} label="Approve the IA">
            <Cmd>y</Cmd>
            <Note>
              Type y and press enter. The agent continues to component selection, token resolution,
              and content generation. Output is written to mode/output/page-*.json. The dashboard
              and preview read the latest file automatically on next load.
            </Note>
          </Step>
        </Group>

        {/* Refresh */}
        <Group title="Refresh — update output or change settings">
          <Step n={1} label="Re-run the agent">
            <Cmd>cd ~/GitHub/mode && node agent/page-builder.js</Cmd>
            <Note>
              Must be run from mode/ — not mode/ui/. Generates a new output file. The dashboard
              and preview pick it up on next page load — no server restart needed.
            </Note>
          </Step>

          <Step n={2} label="Switch preset">
            <Cmd>cd ~/GitHub/mode && node agent/set-preset.js archetype-driven</Cmd>
            <Note>
              Changes the active preset in tokens/mode-tokens.json. Re-run the agent after
              switching to see the new palette resolution in effect.
            </Note>
            <div className="mt-2 space-y-1.5">
              {[
                ["funnel-driven", "dark = decision signal · accumulates toward conversion"],
                ["feature-emphasis", "dark = substance signal · spotlights capabilities"],
                ["archetype-driven", "dark = identity signal · expresses who the user is"],
              ].map(([name, desc]) => (
                <div key={name} className="flex items-baseline gap-2">
                  <code className="text-xs font-mono text-indigo-700 shrink-0">{name}</code>
                  <span className="text-xs text-gray-400">{desc}</span>
                </div>
              ))}
            </div>
          </Step>

          <Step n={3} label="Change the brief">
            <Cmd>{"// edit testBrief in agent/page-builder.js"}</Cmd>
            <Note>
              The brief at the bottom of page-builder.js controls what the agent generates. Change
              archetype (Mover · Validator · Explorer), funnel_stage (awareness · consideration ·
              decision · conversion), or context_mode (organic · campaign · retargeting), then
              re-run.
            </Note>
          </Step>
        </Group>

        {/* Output */}
        <Group title="Output files">
          <div className="space-y-3 text-sm text-gray-600">
            <p>
              Each agent run writes a timestamped JSON file to{" "}
              <code className="font-mono text-gray-800">mode/output/</code>. The dashboard and
              preview always read the most recently modified file — no config needed.
            </p>
            <p>
              Old runs are kept as-is. Delete files from{" "}
              <code className="font-mono text-gray-800">output/</code> manually if you want to
              clear history.
            </p>
            <p>
              Schema version{" "}
              <code className="font-mono text-gray-800">1.1.0</code> and above includes preset
              metadata and behavioral tokens. Files at{" "}
              <code className="font-mono text-gray-800">1.0.0</code> will show — in the preset and
              palette driver fields on the Overview tab.
            </p>
          </div>
        </Group>

      </div>
    </main>
  );
}
