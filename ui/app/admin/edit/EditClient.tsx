"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import type { PageOutput } from "@/lib/types";
import type { VariantData } from "./page";

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
}: {
  value: CTAValue;
  onChange: (v: CTAValue) => void;
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
        <input
          type="text"
          value={value.href}
          onChange={(e) => onChange({ ...value, href: e.target.value })}
          className="w-full rounded-md border border-gray-300 px-3 py-1.5 font-mono text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
}: {
  slotKey: string;
  value: unknown;
  onChange: (v: unknown) => void;
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
// Main component
// ---------------------------------------------------------------------------

interface EditClientProps {
  variants: VariantData[];
  preset?: string;
}

export function EditClient({ variants, preset }: EditClientProps) {
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
              {/* Section header + save button */}
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
                <button
                  onClick={() => saveSection(activeVariant, selectedSection)}
                  disabled={
                    !hasUnsaved(activeVariant, selectedSection) ||
                    savingKey === `${activeVariant}:${selectedSection}`
                  }
                  className={`flex-shrink-0 rounded-md px-4 py-1.5 text-sm font-semibold transition-colors ${
                    hasUnsaved(activeVariant, selectedSection)
                      ? "bg-indigo-600 text-white hover:bg-indigo-700"
                      : "cursor-not-allowed bg-gray-100 text-gray-400"
                  }`}
                >
                  {savingKey === `${activeVariant}:${selectedSection}`
                    ? "Saving…"
                    : "Save"}
                </button>
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
