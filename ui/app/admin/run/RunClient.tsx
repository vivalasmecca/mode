"use client";

import { useState } from "react";
import Link from "next/link";

interface RunClientProps {
  activeBuildTs: string | null;
  variantLabels: string[];
}

export function RunClient({ activeBuildTs, variantLabels }: RunClientProps) {
  const [state, setstate] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleDeploy() {
    setstate("loading");
    setMessage("");
    try {
      const res = await fetch("/api/admin/deploy", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Deploy failed");
      setstate("done");
      setMessage(data.message || "Pushed. Vercel deployment in progress.");
    } catch (e) {
      setstate("error");
      setMessage(String(e));
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
          Deploy to Vercel
        </h2>
        {state === "done" && (
          <span className="text-xs font-medium text-green-700">Pushed ✓</span>
        )}
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Active build status */}
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
              <p className="text-xs text-gray-400">
                {variantLabels.join(" · ")}
              </p>
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
          <code className="font-mono text-xs">config/</code>, then pushes to trigger
          a Vercel deployment. Picks up any edits made in the Edit tab.
        </p>

        {state === "error" && (
          <p className="font-mono text-sm text-red-600 break-all">{message}</p>
        )}
        {state === "done" && (
          <p className="text-sm text-green-700">{message}</p>
        )}

        <div className="flex items-center gap-3">
          {state !== "done" && (
            <button
              onClick={handleDeploy}
              disabled={!activeBuildTs || state === "loading"}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {state === "loading" ? "Deploying…" : "Deploy"}
            </button>
          )}
          {state === "done" && (
            <button
              onClick={() => { setstate("idle"); setMessage(""); }}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
