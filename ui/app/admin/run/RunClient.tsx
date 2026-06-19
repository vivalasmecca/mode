"use client";

import { useState } from "react";
import Link from "next/link";
import type { RoutingEvent } from "@/lib/log-event";

interface RunClientProps {
  activeBuildTs: string | null;
  variantLabels: string[];
  recentEvents: RoutingEvent[];
}

const SIGNAL_STYLES: Record<string, string> = {
  param:        "bg-purple-100 text-purple-700",
  utm_medium:   "bg-blue-100 text-blue-700",
  utm_campaign: "bg-blue-100 text-blue-700",
  utm_content:  "bg-blue-100 text-blue-700",
  cookie:       "bg-amber-100 text-amber-700",
  ua:           "bg-violet-100 text-violet-700",
  default:      "bg-gray-100 text-gray-500",
};

function SignalChip({ signal }: { signal: string }) {
  const cls = SIGNAL_STYLES[signal] ?? "bg-gray-100 text-gray-500";
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${cls}`}>
      {signal}
    </span>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return d.toLocaleDateString();
}

export function RunClient({ activeBuildTs, variantLabels, recentEvents }: RunClientProps) {
  const [deployState, setDeployState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [events, setEvents] = useState<RoutingEvent[]>(recentEvents);
  const [clearState, setClearState] = useState<"idle" | "loading">("idle");

  async function handleClearEvents() {
    setClearState("loading");
    try {
      await fetch("/api/admin/events", { method: "DELETE" });
      setEvents([]);
    } finally {
      setClearState("idle");
    }
  }

  async function handleDeploy() {
    setDeployState("loading");
    setMessage("");
    try {
      const res = await fetch("/api/admin/deploy", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Deploy failed");
      setDeployState("done");
      setMessage(data.message || "Pushed. Vercel deployment in progress.");
    } catch (e) {
      setDeployState("error");
      setMessage(String(e));
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Deploy panel ─────────────────────────────────────────── */}
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
            Deploy to Vercel
          </h2>
          {deployState === "done" && (
            <span className="text-xs font-medium text-green-700">Pushed ✓</span>
          )}
        </div>

        <div className="px-5 py-4 space-y-4">
          {activeBuildTs ? (
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-widest">
                Active build
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <code className="font-mono text-sm text-gray-800">{activeBuildTs}</code>
                <Link
                  href={`/admin/edit?ts=${encodeURIComponent(activeBuildTs)}`}
                  className="text-xs text-indigo-600 hover:text-indigo-800"
                >
                  Edit →
                </Link>
                <Link
                  href={`/admin/site?ts=${encodeURIComponent(activeBuildTs)}`}
                  target="_blank"
                  className="text-xs text-indigo-600 hover:text-indigo-800"
                >
                  Preview →
                </Link>
              </div>
              {variantLabels.length > 0 && (
                <p className="text-xs text-gray-400">{variantLabels.join(" · ")}</p>
              )}
            </div>
          ) : (
            <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2">
              <p className="text-xs text-amber-700">
                No active build. Generate and activate a build from the{" "}
                <Link href="/admin/build" className="underline">
                  Build tab
                </Link>{" "}
                first.
              </p>
            </div>
          )}

          <p className="text-sm text-gray-500">
            Commits <code className="font-mono text-xs">output/</code> and{" "}
            <code className="font-mono text-xs">config/</code>, then pushes to trigger a Vercel
            deployment. Picks up any edits made in the Edit tab.
          </p>

          {deployState === "error" && (
            <p className="font-mono text-sm text-red-600 break-all">{message}</p>
          )}
          {deployState === "done" && (
            <p className="text-sm text-green-700">{message}</p>
          )}

          <div className="flex items-center gap-3">
            {deployState !== "done" && (
              <button
                onClick={handleDeploy}
                disabled={!activeBuildTs || deployState === "loading"}
                className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {deployState === "loading" ? "Deploying…" : "Deploy"}
              </button>
            )}
            {deployState === "done" && (
              <button
                onClick={() => { setDeployState("idle"); setMessage(""); }}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Routing activity ─────────────────────────────────────── */}
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
            Routing activity
          </h2>
          <div className="flex items-center gap-3">
            {events.length > 0 && (
              <span className="text-xs text-gray-400">{events.length} recent</span>
            )}
            {events.length > 0 && (
              <button
                onClick={handleClearEvents}
                disabled={clearState === "loading"}
                className="text-xs text-gray-400 hover:text-red-600 transition-colors disabled:opacity-40"
              >
                {clearState === "loading" ? "Clearing…" : "Clear history"}
              </button>
            )}
          </div>
        </div>

        {events.length === 0 ? (
          <div className="px-5 py-6 text-center">
            <p className="text-sm text-gray-400">No events yet.</p>
            <p className="text-xs text-gray-400 mt-1">
              Visit the live site to see routing decisions appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-2 text-left font-medium text-gray-400 whitespace-nowrap">Time</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-400 whitespace-nowrap">Funnel stage</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-400 whitespace-nowrap">Archetype</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-400 whitespace-nowrap">Variant served</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap font-mono">
                      {formatTime(e.ts)}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className="text-gray-800 mr-1.5">{e.funnel_stage}</span>
                      <SignalChip signal={e.funnel_signal} />
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className="text-gray-800 mr-1.5">{e.archetype}</span>
                      <SignalChip signal={e.archetype_signal} />
                    </td>
                    <td className="px-4 py-2.5 text-gray-800 whitespace-nowrap">
                      {e.variant_label}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
