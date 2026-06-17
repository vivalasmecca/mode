"use client";

import { useState, useEffect } from "react";

interface PresetConfig {
  key: string;
  description: string;
  paletteDriver: string;
  variantDimension: string;
  variantValues: string[];
  fixedDimension: string;
}

interface ConfigResponse {
  activePreset: string;
  presets: PresetConfig[];
}

interface IABeat {
  name: string;
  rationale: string;
}

interface IASection {
  name: string;
  beat: string;
  rationale: string;
  candidate_components: string[];
}

interface VariantIA {
  label: string;
  brief: Record<string, string>;
  ia: { beats: IABeat[]; sections: IASection[] };
  preset: string;
}

interface VariantResult {
  label: string;
  filename: string;
  previewUrl: string;
  siteUrl: string;
}

type Step =
  | "config-loading"
  | "form"
  | "ia-loading"
  | "ia-review"
  | "page-loading"
  | "done"
  | "error";

const FIXED_DEFAULTS: Record<string, string> = {
  archetype: "Validator",
  funnel_stage: "decision",
};

const FIXED_OPTIONS: Record<string, { value: string; label: string }[]> = {
  archetype: [
    { value: "Mover", label: "Mover" },
    { value: "Validator", label: "Validator" },
    { value: "Explorer", label: "Explorer" },
  ],
  funnel_stage: [
    { value: "awareness", label: "awareness" },
    { value: "consideration", label: "consideration" },
    { value: "decision", label: "decision" },
    { value: "conversion", label: "conversion" },
  ],
};

// Human-readable labels for palette driver values
const PALETTE_DRIVER_LABELS: Record<string, string> = {
  funnel_stage: "funnel stage",
  archetype: "archetype",
  editorial_intent: "editorial intent",
};

export default function BuildClient() {
  const [step, setStep] = useState<Step>("config-loading");
  const [allPresets, setAllPresets] = useState<PresetConfig[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<PresetConfig | null>(null);
  const [baseBrief, setBaseBrief] = useState<Record<string, string>>({
    audience: "",
    goal: "",
    context_mode: "organic",
  });
  const [variants, setVariants] = useState<VariantIA[]>([]);
  const [results, setResults] = useState<VariantResult[]>([]);
  const [builtSiteUrl, setBuiltSiteUrl] = useState("");
  const [builtTs, setBuiltTs] = useState("");
  const [activateState, setActivateState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [activateError, setActivateError] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [regenState, setRegenState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [regenError, setRegenError] = useState("");
  const [repalettePreset, setRepalettePreset] = useState("");
  const [repaletteState, setRepaletteState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [repaletteError, setRepaletteError] = useState("");
  const [deployState, setDeployState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [deployMessage, setDeployMessage] = useState("");

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data: ConfigResponse & { error?: string }) => {
        if (data.error) throw new Error(data.error);
        setAllPresets(data.presets);
        const active = data.presets.find((p) => p.key === data.activePreset) ?? data.presets[0];
        setSelectedPreset(active);
        setBaseBrief((b) => ({
          ...b,
          [active.fixedDimension]: FIXED_DEFAULTS[active.fixedDimension] ?? "",
        }));
        setStep("form");
      })
      .catch((err) => {
        setErrorMsg(String(err));
        setStep("error");
      });
  }, []);

  // When the selected preset changes, reset the fixed dimension field to its default.
  function handlePresetChange(key: string) {
    const preset = allPresets.find((p) => p.key === key);
    if (!preset) return;
    setSelectedPreset(preset);
    setBaseBrief((b) => ({
      ...b,
      // Clear the old fixed dimension and set the new one's default
      archetype: undefined as unknown as string,
      funnel_stage: undefined as unknown as string,
      [preset.fixedDimension]: FIXED_DEFAULTS[preset.fixedDimension] ?? "",
    }));
  }

  async function handleBriefSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPreset) return;
    setStep("ia-loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/generate/ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseBrief,
          variantDimension: selectedPreset.variantDimension,
          variantValues: selectedPreset.variantValues,
          preset: selectedPreset.key,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "IA generation failed");
      setVariants(data.variants);
      setActiveTab(0);
      setStep("ia-review");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStep("error");
    }
  }

  async function handleApprove() {
    setStep("page-loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/generate/page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variants }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Page generation failed");
      setResults(data.variants);
      setBuiltSiteUrl(data.siteUrl ?? "");
      setBuiltTs(new URLSearchParams((data.siteUrl ?? "").split("?")[1] ?? "").get("ts") ?? "");
      setActivateState("idle");
      setActivateError("");
      window.open(data.siteUrl, "_blank", "noopener,noreferrer");
      setStep("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStep("error");
    }
  }

  async function handleReppalette() {
    setRepaletteState("loading");
    setRepaletteError("");
    try {
      const res = await fetch("/api/generate/palette", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filenames: results.map((r) => r.filename), preset: repalettePreset }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Palette re-application failed");
      setResults(data.variants);
      setBuiltSiteUrl(data.siteUrl ?? "");
      setBuiltTs(new URLSearchParams((data.siteUrl ?? "").split("?")[1] ?? "").get("ts") ?? "");
      setActivateState("idle");
      setActivateError("");
      window.open(data.siteUrl, "_blank", "noopener,noreferrer");
      setRepaletteState("done");
    } catch (err) {
      setRepaletteError(err instanceof Error ? err.message : String(err));
      setRepaletteState("error");
    }
  }

  async function handleRegenerate() {
    setRegenState("loading");
    setRegenError("");
    try {
      const res = await fetch("/api/generate/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filenames: results.map((r) => r.filename) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Regeneration failed");
      setResults(data.variants);
      setBuiltSiteUrl(data.siteUrl ?? "");
      setBuiltTs(new URLSearchParams((data.siteUrl ?? "").split("?")[1] ?? "").get("ts") ?? "");
      setActivateState("idle");
      setActivateError("");
      window.open(data.siteUrl, "_blank", "noopener,noreferrer");
      setRegenState("done");
    } catch (err) {
      setRegenError(err instanceof Error ? err.message : String(err));
      setRegenState("error");
    }
  }

  async function handleActivate() {
    setActivateState("loading");
    setActivateError("");
    try {
      const res = await fetch("/api/routing/activate", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ts: builtTs }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Activation failed");
      setActivateState("done");
    } catch (err) {
      setActivateError(err instanceof Error ? err.message : String(err));
      setActivateState("error");
    }
  }

  async function handleDeploy() {
    setDeployState("loading");
    setDeployMessage("");
    try {
      const res = await fetch("/api/admin/deploy", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Deploy failed");
      setDeployState("done");
      setDeployMessage(data.message || "Pushed.");
    } catch (e) {
      setDeployState("error");
      setDeployMessage(String(e));
    }
  }

  // ─── Loading states ────────────────────────────────────────────────────────

  if (step === "config-loading") {
    return <Spinner message="Loading configuration…" />;
  }

  if (step === "ia-loading") {
    return (
      <Spinner
        message={`Proposing ${selectedPreset?.variantValues.length ?? ""} information architectures…`}
        note="Running in parallel — usually 10–20 seconds."
      />
    );
  }

  if (step === "page-loading") {
    return (
      <Spinner
        message={`Generating ${variants.length} pages…`}
        note="Component selection and content generation running in parallel. Allow 20–40 seconds."
      />
    );
  }

  // ─── Error ─────────────────────────────────────────────────────────────────

  if (step === "error") {
    return (
      <main>
        <div className="max-w-3xl mx-auto px-6 py-8">
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 space-y-3">
            <p className="text-sm font-medium text-red-700">Error</p>
            <p className="text-sm text-red-600 font-mono break-all">{errorMsg}</p>
            <button
              onClick={() => setStep(selectedPreset ? "form" : "config-loading")}
              className="mt-2 px-4 py-2 bg-white border border-red-300 text-red-700 text-sm rounded hover:bg-red-50 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ─── Done ──────────────────────────────────────────────────────────────────

  if (step === "done") {
    return (
      <main>
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {results.length} variant{results.length !== 1 ? "s" : ""} generated
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              A site view tab should have opened with all pages linked in the nav.
            </p>
          </div>

          {/* Site view link */}
          {builtSiteUrl && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                  Site View
                </h3>
              </div>
              <div className="px-5 py-4 flex items-center justify-between">
                <span className="text-sm text-gray-600">{results.length} pages — linked navigation</span>
                <a
                  href={builtSiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  Open site →
                </a>
              </div>
            </div>
          )}

          {/* Re-apply palette */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                Re-apply Palette
              </h3>
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-gray-500">
                Switch to a different palette approach. Remaps visual emphasis per section — all copy is preserved exactly.
              </p>
              <div className="flex items-center gap-3">
                <select
                  value={repalettePreset}
                  onChange={(e) => {
                    setRepalettePreset(e.target.value);
                    setRepaletteState("idle");
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">Select a palette approach…</option>
                  {allPresets.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.key} — {PALETTE_DRIVER_LABELS[p.paletteDriver] ?? p.paletteDriver}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleReppalette}
                  disabled={!repalettePreset || repaletteState === "loading"}
                  className="px-4 py-2 bg-white border border-gray-300 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                >
                  {repaletteState === "loading" ? "Applying…" : "Apply"}
                </button>
              </div>
              {repaletteState === "error" && (
                <p className="text-sm text-red-600 font-mono break-all">{repaletteError}</p>
              )}
              {repaletteState === "done" && (
                <p className="text-sm text-green-700">Palette applied — site view opened.</p>
              )}
            </div>
          </div>

          {/* Individual pages */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                Individual pages
              </h3>
            </div>
            <ul className="divide-y divide-gray-100">
              {results.map((r) => (
                <li key={r.label} className="px-5 py-4 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900 capitalize">{r.label}</span>
                  <a
                    href={r.siteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Open →
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Activate */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                Activate
              </h3>
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-gray-500">
                Serve this build at{" "}
                <code className="font-mono text-xs text-gray-700">/</code>. Routing resolves the
                right variant per visitor from UTM params, cookies, and device signals.
              </p>
              {activateState === "error" && (
                <p className="text-sm text-red-600 font-mono break-all">{activateError}</p>
              )}
              {activateState === "done" ? (
                <p className="text-sm text-green-700">
                  Active — live at{" "}
                  <a
                    href="/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-green-800 transition-colors"
                  >
                    /
                  </a>
                </p>
              ) : (
                <button
                  onClick={handleActivate}
                  disabled={!builtTs || activateState === "loading"}
                  className="px-4 py-2 bg-white border border-gray-300 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {activateState === "loading" ? "Activating…" : "Activate"}
                </button>
              )}
            </div>
          </div>

          {/* Deploy to Vercel */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                Deploy to Vercel
              </h3>
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-gray-500">
                Commit output and config files, then push to trigger a Vercel deployment.
              </p>
              {deployState === "error" && (
                <p className="text-sm text-red-600 font-mono break-all">{deployMessage}</p>
              )}
              {deployState === "done" && (
                <p className="text-sm text-green-700">{deployMessage}</p>
              )}
              {deployState !== "done" && (
                <button
                  onClick={handleDeploy}
                  disabled={activateState !== "done" || deployState === "loading"}
                  className="px-4 py-2 bg-white border border-gray-300 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {deployState === "loading" ? "Deploying…" : "Deploy"}
                </button>
              )}
            </div>
          </div>

          {/* Regenerate copy */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                Regenerate Copy
              </h3>
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-gray-500">
                Re-run only content generation. Preserves the IA and component selection from this build — only slot values change.
              </p>
              {regenState === "error" && (
                <p className="text-sm text-red-600 font-mono break-all">{regenError}</p>
              )}
              {regenState === "done" && (
                <p className="text-sm text-green-700">New copy generated — site view opened.</p>
              )}
              <button
                onClick={handleRegenerate}
                disabled={regenState === "loading"}
                className="px-4 py-2 bg-white border border-gray-300 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {regenState === "loading" ? "Generating…" : "Regenerate copy"}
              </button>
            </div>
          </div>

          <button
            onClick={() => {
              setResults([]);
              setVariants([]);
              setBuiltSiteUrl("");
              setBuiltTs("");
              setActivateState("idle");
              setActivateError("");
              setDeployState("idle");
              setDeployMessage("");
              setRegenState("idle");
              setRegenError("");
              setRepalettePreset("");
              setRepaletteState("idle");
              setRepaletteError("");
              setStep("form");
            }}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Build another
          </button>
        </div>
      </main>
    );
  }

  // ─── IA review ─────────────────────────────────────────────────────────────

  if (step === "ia-review" && variants.length > 0 && selectedPreset) {
    const active = variants[activeTab];
    const dimLabel = selectedPreset.variantDimension.replace("_", " ");

    return (
      <main>
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Proposed Information Architecture
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {variants.length} variants — one per {dimLabel}. Review each, then generate all.
            </p>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Tab bar */}
            <div className="flex border-b border-gray-200 bg-gray-50 overflow-x-auto">
              {variants.map((v, i) => (
                <button
                  key={v.label}
                  onClick={() => setActiveTab(i)}
                  className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-widest whitespace-nowrap transition-colors ${
                    i === activeTab
                      ? "bg-white text-gray-900 border-b-2 border-indigo-600 -mb-px"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>

            {/* Beat sequence */}
            {active.ia.beats && active.ia.beats.length > 0 && (
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mr-1">
                    Beats
                  </span>
                  {active.ia.beats.map((b, i) => (
                    <span key={i} className="flex items-center gap-1">
                      {i > 0 && <span className="text-gray-300 text-xs">→</span>}
                      <span className="rounded bg-white border border-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
                        {b.name}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Active variant sections */}
            <ol className="divide-y divide-gray-100">
              {active.ia.sections.map((section, i) => (
                <li key={i} className="px-5 py-4 space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold flex items-center justify-center">
                      {i + 1}
                    </span>
                    {section.beat && (
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">
                        {section.beat}
                      </span>
                    )}
                    <span className="text-sm font-medium text-gray-900">{section.name}</span>
                  </div>
                  <p className="text-xs text-gray-500 pl-8">{section.rationale}</p>
                  <div className="pl-8 flex flex-wrap gap-1.5 mt-1">
                    {section.candidate_components.map((c) => (
                      <span
                        key={c}
                        className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-mono rounded"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleApprove}
              className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors"
            >
              Approve &amp; Generate All {variants.length}
            </button>
            <button
              onClick={() => setStep("form")}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Start over
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ─── Form ──────────────────────────────────────────────────────────────────

  if (!selectedPreset) return <Spinner message="Loading…" />;

  const fixedLabel =
    selectedPreset.fixedDimension === "archetype" ? "Archetype" : "Funnel Stage";
  const fixedOptions =
    FIXED_OPTIONS[selectedPreset.fixedDimension] ?? FIXED_OPTIONS.archetype;

  return (
    <main>
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h2 className="text-base font-semibold text-gray-900">New Build</h2>
          <p className="text-sm text-gray-500 mt-1">
            Choose a palette approach, fill in the brief. The system generates all{" "}
            {selectedPreset.variantValues.length}{" "}
            {selectedPreset.variantDimension.replace("_", " ")} variants automatically.
          </p>
        </div>

        {/* Palette driver selector */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
              Palette Approach
            </h3>
          </div>
          <div className="p-5 space-y-3">
            {allPresets.map((p) => {
              const isSelected = p.key === selectedPreset.key;
              return (
                <label
                  key={p.key}
                  className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                    isSelected
                      ? "border-indigo-300 bg-indigo-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="preset"
                    value={p.key}
                    checked={isSelected}
                    onChange={() => handlePresetChange(p.key)}
                    className="mt-0.5 accent-indigo-600"
                  />
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-900 font-mono">{p.key}</span>
                      <span className="text-xs text-gray-400">
                        palette driven by {PALETTE_DRIVER_LABELS[p.paletteDriver] ?? p.paletteDriver}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 leading-snug">{p.description}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Generates:{" "}
                      {p.variantValues.map((v, i) => (
                        <span key={v}>
                          {i > 0 && " · "}
                          <span className="font-mono">{v}</span>
                        </span>
                      ))}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        <form
          onSubmit={handleBriefSubmit}
          className="border border-gray-200 rounded-lg overflow-hidden"
        >
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
              Brief
            </h3>
          </div>
          <div className="p-6 space-y-5">
            <Field label="Audience" htmlFor="audience">
              <input
                id="audience"
                type="text"
                required
                value={baseBrief.audience ?? ""}
                onChange={(e) =>
                  setBaseBrief((b) => ({ ...b, audience: e.target.value }))
                }
                placeholder="e.g. SaaS trial users"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </Field>

            <Field label={fixedLabel} htmlFor="fixed-dim">
              <select
                id="fixed-dim"
                required
                value={baseBrief[selectedPreset.fixedDimension] ?? ""}
                onChange={(e) =>
                  setBaseBrief((b) => ({
                    ...b,
                    [selectedPreset.fixedDimension]: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              >
                {fixedOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Goal" htmlFor="goal">
              <input
                id="goal"
                type="text"
                required
                value={baseBrief.goal ?? ""}
                onChange={(e) =>
                  setBaseBrief((b) => ({ ...b, goal: e.target.value }))
                }
                placeholder="e.g. Convert trial to paid"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </Field>

            <Field label="Context Mode" htmlFor="context_mode">
              <select
                id="context_mode"
                required
                value={baseBrief.context_mode ?? "organic"}
                onChange={(e) =>
                  setBaseBrief((b) => ({ ...b, context_mode: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              >
                <option value="organic">organic</option>
                <option value="campaign">campaign</option>
                <option value="retargeting">retargeting</option>
              </select>
            </Field>
          </div>

          <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors"
            >
              Propose Architectures
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="block text-xs font-semibold uppercase tracking-widest text-gray-500"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function Spinner({ message, note }: { message: string; note?: string }) {
  return (
    <main>
      <div className="max-w-3xl mx-auto px-6 py-16 flex flex-col items-center text-center gap-4">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-gray-900">{message}</p>
        {note && <p className="text-xs text-gray-400">{note}</p>}
      </div>
    </main>
  );
}
