"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import type { PageOutput } from "@/lib/types";
import type { VariantData } from "./page";

// ---------------------------------------------------------------------------
// Href combobox — text input + named link dropdown
// ---------------------------------------------------------------------------

function HrefField({
  value,
  onChange,
  namedLinks,
}: {
  value: string;
  onChange: (v: string) => void;
  namedLinks?: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const hasLinks = namedLinks && Object.keys(namedLinks).length > 0;

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  // Detect if current value matches a named link
  const matchingToken = namedLinks
    ? (Object.entries(namedLinks).find(([, url]) => url === value)?.[0] ?? null)
    : null;

  return (
    <div className="relative" ref={ref}>
      <div className="flex gap-1">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-1.5 font-mono text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        {hasLinks && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className={`flex-shrink-0 rounded-md border px-2.5 text-xs font-medium transition-colors ${
              open
                ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                : "border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-700"
            }`}
            title="Named links"
          >
            Links
          </button>
        )}
      </div>

      {/* Token match indicator */}
      {matchingToken && (
        <p className="mt-0.5 text-xs font-medium text-indigo-500">
          → {matchingToken}
        </p>
      )}

      {/* Dropdown */}
      {open && hasLinks && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 rounded-md border border-gray-200 bg-white shadow-md">
          {Object.entries(namedLinks!).map(([name, url]) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                onChange(url);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50"
            >
              <span className="font-medium text-gray-800">{name}</span>
              <span className="max-w-[60%] truncate font-mono text-xs text-gray-400">
                {url}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Keys shown read-only — not editable via this panel
const SKIP_KEYS = new Set(["logo", "media", "nav_links"]);

type SlotType = "string" | "nullable-string" | "cta" | "array" | "object" | "skip";

function inferSlotType(key: string, value: unknown): SlotType {
  if (SKIP_KEYS.has(key)) return "skip";
  if (value === null || value === undefined) return "nullable-string";
  if (typeof value === "string") return "string";
  if (Array.isArray(value)) return "array";
  if (
    typeof value === "object" &&
    value !== null &&
    "label" in value &&
    "href" in value
  )
    return "cta";
  if (typeof value === "object") return "object";
  return "string";
}

// ---------------------------------------------------------------------------
// Auto-height textarea
// ---------------------------------------------------------------------------

function AutoTextarea({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = ref.current.scrollHeight + "px";
    }
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={1}
      className="w-full resize-none overflow-hidden rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
    />
  );
}

// ---------------------------------------------------------------------------
// CTA slot editor
// ---------------------------------------------------------------------------

interface CTAValue {
  label: string;
  href: string;
  variant?: string;
  size?: string;
  [key: string]: unknown;
}

function CTASlotEditor({
  value,
  onChange,
  namedLinks,
}: {
  value: CTAValue;
  onChange: (v: CTAValue) => void;
  namedLinks?: Record<string, string>;
}) {
  return (
    <div className="space-y-2 rounded-md border border-gray-200 bg-gray-50 p-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500">Label</label>
        <input
          type="text"
          value={value.label}
          onChange={(e) => onChange({ ...value, label: e.target.value })}
          className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500">Href</label>
        <HrefField
          value={value.href}
          onChange={(v) => onChange({ ...value, href: v })}
          namedLinks={namedLinks}
        />
      </div>
      {"variant" in value && (
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Variant</label>
          <select
            value={value.variant ?? ""}
            onChange={(e) => onChange({ ...value, variant: e.target.value || undefined })}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">—</option>
            <option value="primary">primary</option>
            <option value="secondary">secondary</option>
            <option value="ghost">ghost</option>
          </select>
        </div>
      )}
      {"size" in value && (
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Size</label>
          <select
            value={value.size ?? ""}
            onChange={(e) => onChange({ ...value, size: e.target.value || undefined })}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">—</option>
            <option value="sm">sm</option>
            <option value="md">md</option>
            <option value="lg">lg</option>
          </select>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Array slot editor
// ---------------------------------------------------------------------------

function ArrayItemEditor({
  item,
  index,
  onChange,
  onRemove,
}: {
  item: Record<string, unknown>;
  index: number;
  onChange: (v: Record<string, unknown>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-2 rounded-md border border-gray-200 bg-white p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-400">Item {index + 1}</span>
        <button
          onClick={onRemove}
          className="text-xs text-red-500 transition-colors hover:text-red-700"
        >
          Remove
        </button>
      </div>
      {Object.entries(item).map(([k, v]) => (
        <div key={k}>
          <label className="mb-1 block text-xs font-medium text-gray-500">{k}</label>
          {typeof v === "string" || v === null ? (
            <AutoTextarea
              value={typeof v === "string" ? v : ""}
              onChange={(newV) => onChange({ ...item, [k]: newV })}
            />
          ) : (
            <div className="break-all rounded border border-gray-200 bg-gray-50 p-2 font-mono text-xs text-gray-400">
              {JSON.stringify(v)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ArraySlotEditor({
  value,
  onChange,
}: {
  value: unknown[];
  onChange: (v: unknown[]) => void;
}) {
  function addItem() {
    if (value.length > 0) {
      const last = value[value.length - 1];
      if (typeof last === "object" && last !== null && !Array.isArray(last)) {
        const blank = Object.fromEntries(
          Object.keys(last as Record<string, unknown>).map((k) => [k, ""])
        );
        onChange([...value, blank]);
        return;
      }
    }
    onChange([...value, ""]);
  }

  return (
    <div className="space-y-2">
      {value.map((item, i) =>
        typeof item === "object" && item !== null && !Array.isArray(item) ? (
          <ArrayItemEditor
            key={i}
            index={i}
            item={item as Record<string, unknown>}
            onChange={(v) => onChange(value.map((x, idx) => (idx === i ? v : x)))}
            onRemove={() => onChange(value.filter((_, idx) => idx !== i))}
          />
        ) : (
          <div key={i} className="flex items-start gap-2">
            <AutoTextarea
              value={typeof item === "string" ? item : JSON.stringify(item)}
              onChange={(v) => onChange(value.map((x, idx) => (idx === i ? v : x)))}
            />
            <button
              onClick={() => onChange(value.filter((_, idx) => idx !== i))}
              className="mt-2 text-xs text-red-500 transition-colors hover:text-red-700"
            >
              ×
            </button>
          </div>
        )
      )}
      <button
        onClick={addItem}
        className="w-full rounded-md border border-dashed border-indigo-300 px-3 py-1.5 text-xs font-medium text-indigo-600 transition-colors hover:border-indigo-400 hover:text-indigo-800"
      >
        + Add item
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skip slot (read-only)
// ---------------------------------------------------------------------------

function SkipSlot({ value }: { value: unknown }) {
  return (
    <div className="break-all rounded-md border border-gray-100 bg-gray-50 px-3 py-2 font-mono text-xs text-gray-400">
      {JSON.stringify(value)}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Slot field router
// ---------------------------------------------------------------------------

function SlotField({
  slotKey,
  value,
  onChange,
  namedLinks,
}: {
  slotKey: string;
  value: unknown;
  onChange: (v: unknown) => void;
  namedLinks?: Record<string, string>;
}) {
  const type = inferSlotType(slotKey, value);

  switch (type) {
    case "skip":
      return <SkipSlot value={value} />;
    case "string":
      return <AutoTextarea value={value as string} onChange={onChange} />;
    case "nullable-string":
      return (
        <AutoTextarea
          value={(value as string | null) ?? ""}
          onChange={(v) => onChange(v === "" ? null : v)}
          placeholder="(empty = null)"
        />
      );
    case "cta":
      return (
        <CTASlotEditor
          value={value as CTAValue}
          onChange={(v) => onChange(v)}
          namedLinks={namedLinks}
        />
      );
    case "array":
      return (
        <ArraySlotEditor
          value={value as unknown[]}
          onChange={(v) => onChange(v)}
        />
      );
    case "object":
      return (
        <div className="break-all whitespace-pre-wrap rounded border border-gray-200 bg-gray-50 p-2 font-mono text-xs text-gray-400">
          {JSON.stringify(value, null, 2)}
        </div>
      );
    default:
      return <AutoTextarea value={String(value)} onChange={onChange} />;
  }
}

// ---------------------------------------------------------------------------
// Palette chip
// ---------------------------------------------------------------------------

const PALETTE_CHIP: Record<string, string> = {
  light: "border border-gray-300 bg-white",
  neutral: "bg-gray-400",
  dark: "bg-gray-900",
};

function PaletteChip({ mode }: { mode?: string | null }) {
  if (!mode) return null;
  return (
    <span
      className={`inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full ${
        PALETTE_CHIP[mode] ?? "bg-gray-300"
      }`}
      title={mode}
    />
  );
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

function Toast({
  message,
  type,
  onDismiss,
}: {
  message: string;
  type: "saving" | "saved" | "error";
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (type === "saved") {
      const t = setTimeout(onDismiss, 3000);
      return () => clearTimeout(t);
    }
  }, [type, onDismiss]);

  const colors = {
    saving: "bg-gray-900 text-white",
    saved: "bg-green-700 text-white",
    error: "bg-red-700 text-white",
  };

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 rounded-lg px-4 py-2.5 text-sm font-medium shadow-lg ${colors[type]}`}
    >
      {message}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Draft state helpers
//
// Keyed as drafts[variantIndex][sectionIndex] = updatedSlots
// ---------------------------------------------------------------------------

type DraftMap = Record<number, Record<number, Record<string, unknown>>>;
type CommittedMap = Record<number, Record<number, Record<string, unknown>>>;

// ---------------------------------------------------------------------------
// Links panel — named link URL inputs, saves to product-context.json
// ---------------------------------------------------------------------------

function LinksPanel({
  linkValues,
  savedLinkValues,
  onChange,
  onSave,
  saveState,
}: {
  linkValues: Record<string, string>;
  savedLinkValues: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onSave: () => void;
  saveState: "idle" | "saving" | "saved" | "error";
}) {
  const keys = Object.keys(linkValues);
  if (keys.length === 0) return null;
  const hasChanges = keys.some((k) => linkValues[k] !== savedLinkValues[k]);

  return (
    <div className="border-b border-gray-200 bg-white px-6 py-4">
      <div className="flex items-center gap-4 flex-wrap">
        <span className="flex-shrink-0 text-xs font-semibold uppercase tracking-widest text-gray-400">
          Links
        </span>
        {keys.map((key) => (
          <div key={key} className="flex items-center gap-1.5 min-w-0 flex-1" style={{ minWidth: "200px", maxWidth: "340px" }}>
            <label className="flex-shrink-0 text-xs font-medium text-gray-500 w-16 text-right">
              {key}
            </label>
            <input
              type="url"
              value={linkValues[key]}
              onChange={(e) => onChange(key, e.target.value)}
              placeholder="https://…"
              className="min-w-0 flex-1 rounded-md border border-gray-200 px-2.5 py-1.5 font-mono text-xs text-gray-900 placeholder-gray-300 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
          </div>
        ))}
        <button
          onClick={onSave}
          disabled={!hasChanges || saveState === "saving"}
          className={`flex-shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
            saveState === "saved"
              ? "bg-green-50 text-green-700"
              : hasChanges
              ? "bg-indigo-600 text-white hover:bg-indigo-700"
              : "cursor-not-allowed bg-gray-100 text-gray-400"
          }`}
        >
          {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved ✓" : "Save links"}
        </button>
        {saveState === "error" && (
          <span className="text-xs text-red-600">Failed to save</span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface EditClientProps {
  variants: VariantData[];
  preset?: string;
  namedLinksRaw?: Record<string, string | null>;
}

export function EditClient({ variants, preset, namedLinksRaw = {} }: EditClientProps) {
  const [activeVariant, setActiveVariant] = useState(0);
  const [selectedSection, setSelectedSection] = useState<number | null>(
    variants[0]?.output.page.length > 0 ? 0 : null
  );
  const [drafts, setDrafts] = useState<DraftMap>({});
  const [committed, setCommitted] = useState<CommittedMap>({});
  const [toast, setToast] = useState<{
    message: string;
    type: "saving" | "saved" | "error";
  } | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Named links state — initialized from server props, updated locally on save
  const initialLinkValues = Object.fromEntries(
    Object.entries(namedLinksRaw)
      .filter(([k]) => !k.startsWith("_"))
      .map(([k, v]) => [k, v ?? ""])
  );
  const [linkValues, setLinkValues] = useState<Record<string, string>>(initialLinkValues);
  const [savedLinkValues, setSavedLinkValues] = useState<Record<string, string>>(initialLinkValues);
  const [linksSaveState, setLinksSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Effective named links for HrefField shortcuts (non-empty values only)
  const effectiveNamedLinks = Object.fromEntries(
    Object.entries(linkValues).filter(([, v]) => v.trim() !== "")
  );

  async function saveLinks() {
    setLinksSaveState("saving");
    try {
      const res = await fetch("/api/brand/links", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          links: Object.fromEntries(
            Object.entries(linkValues).map(([k, v]) => [k, v.trim() || null])
          ),
        }),
      });
      if (!res.ok) throw new Error();
      setSavedLinkValues({ ...linkValues });
      setLinksSaveState("saved");
      setTimeout(() => setLinksSaveState("idle"), 3000);
    } catch {
      setLinksSaveState("error");
    }
  }

  const draftsRef = useRef<DraftMap>(drafts);
  useEffect(() => {
    draftsRef.current = drafts;
  }, [drafts]);

  // Switch variant → reset section selection
  function handleVariantChange(idx: number) {
    setActiveVariant(idx);
    const pageLen = variants[idx]?.output.page.length ?? 0;
    setSelectedSection(pageLen > 0 ? 0 : null);
  }

  const currentVariant = variants[activeVariant];
  const currentOutput: PageOutput | undefined = currentVariant?.output;

  function hasUnsaved(vIdx: number, sIdx: number) {
    return !!(drafts[vIdx]?.[sIdx]);
  }

  function getSlotsFor(vIdx: number, sIdx: number): Record<string, unknown> {
    return (
      drafts[vIdx]?.[sIdx] ??
      committed[vIdx]?.[sIdx] ??
      (variants[vIdx].output.page[sIdx].slots as Record<string, unknown>)
    );
  }

  function updateSlot(vIdx: number, sIdx: number, key: string, value: unknown) {
    setDrafts((prev) => {
      const base =
        prev[vIdx]?.[sIdx] ??
        committed[vIdx]?.[sIdx] ??
        (variants[vIdx].output.page[sIdx].slots as Record<string, unknown>);
      return {
        ...prev,
        [vIdx]: {
          ...prev[vIdx],
          [sIdx]: { ...base, [key]: value },
        },
      };
    });
  }

  const saveSection = useCallback(
    async (vIdx: number, sIdx: number) => {
      const draft = draftsRef.current[vIdx]?.[sIdx];
      if (!draft) return;

      const key = `${vIdx}:${sIdx}`;
      setSavingKey(key);
      setToast({ message: "Saving…", type: "saving" });

      try {
        const res = await fetch("/api/output/save", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            file: variants[vIdx].filename,
            sectionIndex: sIdx,
            slots: draft,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error ?? "Save failed");
        }

        setCommitted((prev) => ({
          ...prev,
          [vIdx]: { ...prev[vIdx], [sIdx]: draft },
        }));
        setDrafts((prev) => {
          const vDrafts = { ...prev[vIdx] };
          delete vDrafts[sIdx];
          const next = { ...prev, [vIdx]: vDrafts };
          if (Object.keys(next[vIdx]).length === 0) delete next[vIdx];
          return next;
        });
        setToast({ message: "Saved", type: "saved" });
      } catch (err) {
        setToast({
          message: err instanceof Error ? err.message : "Save failed",
          type: "error",
        });
      } finally {
        setSavingKey(null);
      }
    },
    [variants]
  );

  const saveAll = useCallback(async () => {
    const snapshot = draftsRef.current;
    for (const vIdxStr of Object.keys(snapshot)) {
      const vIdx = Number(vIdxStr);
      for (const sIdxStr of Object.keys(snapshot[vIdx])) {
        await saveSection(vIdx, Number(sIdxStr));
      }
    }
  }, [saveSection]);

  /**
   * Sync the current slot state for a section to the matching section
   * (matched by section name) in every other variant file in this build.
   * Also saves to the active variant if there's an unsaved draft.
   */
  const syncSection = useCallback(
    async (activeVIdx: number, sectionName: string, slots: Record<string, unknown>) => {
      setSyncing(true);
      setToast({ message: "Syncing to all variants…", type: "saving" });

      let synced = 0;

      for (const [vIdx, variant] of variants.entries()) {
        // Find the section with the same name in this variant
        const sIdx = variant.output.page.findIndex(
          (s) => s.section === sectionName
        );
        if (sIdx === -1) continue;

        try {
          const res = await fetch("/api/output/save", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              file: variant.filename,
              sectionIndex: sIdx,
              slots,
            }),
          });
          if (!res.ok) throw new Error();

          // Update committed state for this variant
          setCommitted((prev) => ({
            ...prev,
            [vIdx]: { ...prev[vIdx], [sIdx]: slots },
          }));

          // Clear draft for the active variant (it was just saved)
          if (vIdx === activeVIdx) {
            setDrafts((prev) => {
              const vDrafts = { ...prev[vIdx] };
              delete vDrafts[sIdx];
              const next = { ...prev, [vIdx]: vDrafts };
              if (Object.keys(next[vIdx] ?? {}).length === 0) delete next[vIdx];
              return next;
            });
          }

          synced++;
        } catch {
          // continue to next variant
        }
      }

      const others = synced - 1; // exclude current variant
      setToast({
        message:
          others > 0
            ? `Saved + synced to ${others} other variant${others !== 1 ? "s" : ""}`
            : "Saved",
        type: "saved",
      });
      setSyncing(false);
    },
    [variants]
  );

  // Total unsaved count across all variants
  const unsavedCount = Object.values(drafts).reduce(
    (sum, v) => sum + Object.keys(v).length,
    0
  );

  const currentSections = currentOutput?.page ?? [];
  const selectedSlots =
    selectedSection !== null
      ? getSlotsFor(activeVariant, selectedSection)
      : null;
  const selectedSectionData =
    selectedSection !== null ? currentSections[selectedSection] : null;

  return (
    <>
      <LinksPanel
        linkValues={linkValues}
        savedLinkValues={savedLinkValues}
        onChange={(key, value) => setLinkValues((prev) => ({ ...prev, [key]: value }))}
        onSave={saveLinks}
        saveState={linksSaveState}
      />
      <div className="flex">
        {/* ----------------------------------------------------------------
            Left panel — variant tabs + section list
        ---------------------------------------------------------------- */}
        <div className="w-64 flex-shrink-0 border-r border-gray-200 bg-white">
          {/* Variant tabs — only shown when there are multiple variants */}
          {variants.length > 1 && (
            <div className="sticky top-0 z-10 border-b border-gray-200 bg-white">
              <div className="px-3 pt-3 pb-0">
                {preset && (
                  <p className="mb-2 font-mono text-xs text-gray-400">{preset}</p>
                )}
                <div className="flex flex-wrap gap-1">
                  {variants.map((v, i) => {
                    const variantUnsaved = Object.keys(drafts[i] ?? {}).length;
                    return (
                      <button
                        key={i}
                        onClick={() => handleVariantChange(i)}
                        className={`relative rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                          activeVariant === i
                            ? "bg-indigo-600 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {v.label}
                        {variantUnsaved > 0 && (
                          <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-amber-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="px-4 pb-2 pt-2">
                <p className="text-xs text-gray-400">
                  {currentSections.length} sections
                </p>
              </div>
            </div>
          )}

          {/* Section list header (single-variant case) */}
          {variants.length === 1 && (
            <div className="sticky top-0 z-10 border-b border-gray-100 bg-white px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Sections
              </p>
              <p className="mt-0.5 text-xs text-gray-500">
                {currentSections.length} total
              </p>
            </div>
          )}

          {/* Section rows */}
          <ul className="divide-y divide-gray-100">
            {currentSections.map((section, i) => {
              const active = selectedSection === i;
              const unsaved = hasUnsaved(activeVariant, i);
              return (
                <li key={i}>
                  <button
                    onClick={() => setSelectedSection(i)}
                    className={`w-full px-4 py-3 text-left transition-colors ${
                      active ? "bg-indigo-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {unsaved && (
                        <span
                          className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400"
                          title="Unsaved changes"
                        />
                      )}
                      <span
                        className={`truncate text-sm font-medium ${
                          active ? "text-indigo-700" : "text-gray-900"
                        }`}
                      >
                        {section.section}
                      </span>
                      <PaletteChip mode={section.palette} />
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <span className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                        {section.component}
                      </span>
                      {section.variant && (
                        <span className="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-600">
                          {section.variant}
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* ----------------------------------------------------------------
            Right panel — slot field editor
        ---------------------------------------------------------------- */}
        <div className="min-w-0 flex-1 bg-gray-50">
          {/* Sticky header */}
          <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-gray-200 bg-white px-6 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <code className="max-w-xs truncate rounded bg-gray-100 px-2 py-1 font-mono text-xs text-gray-700">
                {currentVariant?.filename || "latest output"}
              </code>
              {currentVariant?.filename && (
                <Link
                  href={`/admin/preview?file=${encodeURIComponent(currentVariant.filename)}`}
                  target="_blank"
                  className="whitespace-nowrap text-xs text-indigo-600 hover:text-indigo-800"
                >
                  Open preview →
                </Link>
              )}
            </div>
            {unsavedCount > 0 && (
              <button
                onClick={saveAll}
                className="flex-shrink-0 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-700"
              >
                Save all unsaved ({unsavedCount})
              </button>
            )}
          </div>

          {/* Slot editor */}
          {selectedSectionData && selectedSlots && selectedSection !== null ? (
            <div className="max-w-2xl px-6 py-6">
              {/* Section header + save / sync buttons */}
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    {selectedSectionData.section}
                  </h2>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {selectedSectionData.component}
                    {selectedSectionData.variant
                      ? ` · ${selectedSectionData.variant}`
                      : ""}
                    {selectedSectionData.palette
                      ? ` · ${selectedSectionData.palette}`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-shrink-0 flex-col items-end gap-1">
                  <button
                    onClick={() => saveSection(activeVariant, selectedSection)}
                    disabled={
                      !hasUnsaved(activeVariant, selectedSection) ||
                      savingKey === `${activeVariant}:${selectedSection}`
                    }
                    className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-colors ${
                      hasUnsaved(activeVariant, selectedSection)
                        ? "bg-indigo-600 text-white hover:bg-indigo-700"
                        : "cursor-not-allowed bg-gray-100 text-gray-400"
                    }`}
                  >
                    {savingKey === `${activeVariant}:${selectedSection}`
                      ? "Saving…"
                      : "Save"}
                  </button>
                  {variants.length > 1 && (
                    <button
                      onClick={() =>
                        syncSection(
                          activeVariant,
                          selectedSectionData.section,
                          getSlotsFor(activeVariant, selectedSection)
                        )
                      }
                      disabled={syncing}
                      className="text-xs text-gray-400 transition-colors hover:text-gray-700 disabled:cursor-not-allowed"
                    >
                      {syncing ? "Syncing…" : "Sync to all variants"}
                    </button>
                  )}
                </div>
              </div>

              {/* Fields */}
              <div className="space-y-5">
                {Object.entries(selectedSlots).map(([key, value]) => {
                  const type = inferSlotType(key, value);
                  return (
                    <div key={key}>
                      <div className="mb-1.5 flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-700">
                          {key}
                        </label>
                        {type === "skip" && (
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-400">
                            read-only
                          </span>
                        )}
                        <span className="text-xs text-gray-400">{type}</span>
                      </div>
                      <SlotField
                        slotKey={key}
                        value={value}
                        namedLinks={effectiveNamedLinks}
                        onChange={(v) => {
                          if (type !== "skip") {
                            updateSlot(activeVariant, selectedSection, key, v);
                          }
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-gray-400">
              Select a section to edit its slots
            </div>
          )}
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </>
  );
}
