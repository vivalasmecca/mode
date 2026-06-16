"use client";

import { useState } from "react";

type ExtractState = "idle" | "loading" | "done" | "error";
type SaveState = "idle" | "saving" | "saved" | "error";

function isPopulated(raw: string): boolean {
  try {
    const parsed = JSON.parse(raw);
    return Boolean(parsed.product_name);
  } catch {
    return false;
  }
}

function isBriefPopulated(text: string): boolean {
  return Boolean(text.trim()) && !text.includes("_Populate via the Brand Setup tab");
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>
      {children}
    </div>
  );
}

// ─── Save bar ─────────────────────────────────────────────────────────────────

function SaveBar({
  hasChanges,
  saveState,
  onSave,
  onDiscard,
  label = "Save",
}: {
  hasChanges: boolean;
  saveState: SaveState;
  onSave: () => void;
  onDiscard: () => void;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-3 flex-shrink-0">
      {saveState === "saved" && (
        <p className="text-xs text-gray-400">Saved.</p>
      )}
      {saveState === "error" && (
        <p className="text-xs text-red-500">Save failed.</p>
      )}
      {hasChanges && saveState !== "saved" && (
        <>
          <button
            onClick={onDiscard}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Discard
          </button>
          <button
            onClick={onSave}
            disabled={saveState === "saving"}
            className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {saveState === "saving" ? "Saving…" : label}
          </button>
        </>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function BrandClient({
  initialProductContext,
  initialBrandBrief,
}: {
  initialProductContext: string;
  initialBrandBrief: string;
}) {
  // ── Extract state
  const [urlInput, setUrlInput] = useState("");
  const [extractState, setExtractState] = useState<ExtractState>("idle");
  const [extractError, setExtractError] = useState("");

  // ── Product context state
  const [productContextRaw, setProductContextRaw] = useState(initialProductContext);
  const [savedProductContext, setSavedProductContext] = useState(initialProductContext);
  const [jsonError, setJsonError] = useState("");
  const [contextSaveState, setContextSaveState] = useState<SaveState>("idle");

  // ── Brand brief state
  const [brandBrief, setBrandBrief] = useState(initialBrandBrief);
  const [savedBrandBrief, setSavedBrandBrief] = useState(initialBrandBrief);
  const [briefSaveState, setBriefSaveState] = useState<SaveState>("idle");

  const contextHasChanges = productContextRaw !== savedProductContext;
  const briefHasChanges = brandBrief !== savedBrandBrief;
  const populated = isPopulated(productContextRaw);
  const briefPopulated = isBriefPopulated(brandBrief);

  // ── Handlers

  function handleJsonChange(value: string) {
    setProductContextRaw(value);
    setContextSaveState("idle");
    try {
      JSON.parse(value);
      setJsonError("");
    } catch {
      setJsonError("Invalid JSON");
    }
  }

  async function handleExtract() {
    const urls = urlInput
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean);
    if (urls.length === 0) return;

    setExtractState("loading");
    setExtractError("");
    try {
      const res = await fetch("/api/brand/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Extraction failed");

      setProductContextRaw(JSON.stringify(data.productContext, null, 2));
      setJsonError("");
      setContextSaveState("idle");
      setBrandBrief(data.brandBrief);
      setBriefSaveState("idle");
      setExtractState("done");
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : String(err));
      setExtractState("error");
    }
  }

  async function handleContextSave() {
    if (jsonError) return;
    setContextSaveState("saving");
    try {
      const parsed = JSON.parse(productContextRaw);
      const res = await fetch("/api/brand/save", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productContext: parsed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSavedProductContext(productContextRaw);
      setContextSaveState("saved");
    } catch {
      setContextSaveState("error");
    }
  }

  async function handleBriefSave() {
    setBriefSaveState("saving");
    try {
      const res = await fetch("/api/brand/save", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandBrief }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSavedBrandBrief(brandBrief);
      setBriefSaveState("saved");
    } catch {
      setBriefSaveState("error");
    }
  }

  return (
    <main>
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-10">

        {/* ── Extract ──────────────────────────────────────────────── */}
        <Section
          title="Extract from URLs"
          description="Paste your website URLs (one per line). The agent fetches each page and extracts product context and a draft brand brief."
        >
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-100 px-5 py-3 flex items-center justify-between gap-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Source URLs
              </p>
              {extractState === "done" && (
                <p className="text-xs text-gray-400">Extracted — review and save below.</p>
              )}
              {extractState === "error" && (
                <p className="text-xs text-red-500">{extractError}</p>
              )}
            </div>
            <div className="p-5 space-y-3">
              <textarea
                rows={4}
                value={urlInput}
                onChange={(e) => { setUrlInput(e.target.value); setExtractState("idle"); }}
                placeholder={"https://example.com\nhttps://example.com/pricing\nhttps://example.com/about"}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
              />
              <button
                onClick={handleExtract}
                disabled={extractState === "loading" || !urlInput.trim()}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {extractState === "loading" ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Extracting…
                  </>
                ) : (
                  "Extract from URLs"
                )}
              </button>
              {extractState === "loading" && (
                <p className="text-xs text-gray-400">Fetching pages and running extraction — allow 20–30 seconds.</p>
              )}
            </div>
          </div>
        </Section>

        {/* ── Product context ───────────────────────────────────────── */}
        <Section
          title="Product Context"
          description="Structured product facts injected into every build. The content generator uses this as the source of truth — it won't invent claims that go beyond this data."
        >
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-100 px-5 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                  product-context.json
                </p>
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                  populated
                    ? "bg-green-50 text-green-700"
                    : "bg-gray-100 text-gray-400"
                }`}>
                  {populated ? "populated" : "empty"}
                </span>
              </div>
              <SaveBar
                hasChanges={contextHasChanges && !jsonError}
                saveState={contextSaveState}
                onSave={handleContextSave}
                onDiscard={() => { setProductContextRaw(savedProductContext); setJsonError(""); setContextSaveState("idle"); }}
                label="Save context"
              />
            </div>
            <div className="p-5 space-y-2">
              <textarea
                rows={16}
                value={productContextRaw}
                onChange={(e) => handleJsonChange(e.target.value)}
                spellCheck={false}
                className={`w-full px-3 py-2 border rounded-md text-xs font-mono focus:outline-none focus:ring-2 focus:border-indigo-500 resize-y bg-gray-950 text-gray-100 ${
                  jsonError
                    ? "border-red-400 focus:ring-red-400"
                    : "border-gray-700 focus:ring-indigo-500"
                }`}
              />
              {jsonError && (
                <p className="text-xs text-red-500">{jsonError}</p>
              )}
            </div>
          </div>
        </Section>

        {/* ── Brand brief ──────────────────────────────────────────── */}
        <Section
          title="Brand Brief"
          description="Tone, messaging pillars, and claim territory. Injected into the content generator as a prompt fragment. Edit directly — no extraction needed."
        >
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-100 px-5 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                  brand-brief.md
                </p>
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                  briefPopulated
                    ? "bg-green-50 text-green-700"
                    : "bg-gray-100 text-gray-400"
                }`}>
                  {briefPopulated ? "populated" : "empty"}
                </span>
              </div>
              <SaveBar
                hasChanges={briefHasChanges}
                saveState={briefSaveState}
                onSave={handleBriefSave}
                onDiscard={() => { setBrandBrief(savedBrandBrief); setBriefSaveState("idle"); }}
                label="Save brief"
              />
            </div>
            <div className="p-5">
              <textarea
                rows={18}
                value={brandBrief}
                onChange={(e) => { setBrandBrief(e.target.value); setBriefSaveState("idle"); }}
                spellCheck={false}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
              />
            </div>
          </div>
        </Section>

      </div>
    </main>
  );
}
