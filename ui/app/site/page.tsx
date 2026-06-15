import { getSiteManifest, getOutputByFile } from "@/lib/get-output";
import type { SiteManifest } from "@/lib/types";
import { PreviewClient } from "@/components/preview/PreviewClient";

export const dynamic = "force-dynamic";

// ─── Nav bar ─────────────────────────────────────────────────────────────────

function SiteNav({
  manifest,
  currentLabel,
}: {
  manifest: SiteManifest;
  currentLabel: string;
}) {
  const fixedValue = manifest.brief.archetype ?? manifest.brief.funnel_stage ?? "";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-11 bg-gray-950 border-b border-gray-800 flex items-center px-6 gap-6">
      <span className="text-xs font-semibold text-white tracking-widest mr-2">MODE</span>

      <div className="flex items-center gap-1">
        {manifest.pages.map((p) => {
          const isActive = p.label === currentLabel;
          const displayLabel = p.label.charAt(0).toUpperCase() + p.label.slice(1);
          return (
            <a
              key={p.label}
              href={p.siteUrl}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                isActive
                  ? "bg-gray-800 text-white"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-900"
              }`}
            >
              {displayLabel}
            </a>
          );
        })}
      </div>

      <div className="ml-auto flex items-center gap-2 text-xs text-gray-600 font-mono">
        <span>{manifest.preset}</span>
        {fixedValue && (
          <>
            <span>·</span>
            <span>{fixedValue}</span>
          </>
        )}
      </div>
    </nav>
  );
}

// ─── Not found ───────────────────────────────────────────────────────────────

function NotFound({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center px-6">
      <div className="text-4xl">◻</div>
      <h1 className="text-xl font-semibold text-gray-900">Not found</h1>
      <p className="max-w-sm text-sm text-gray-500">{message}</p>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function SitePage({
  searchParams,
}: {
  searchParams: Promise<{ ts?: string; page?: string }>;
}) {
  const { ts, page: pageLabel } = await searchParams;

  if (!ts) {
    return <NotFound message="No build timestamp in URL. Generate a site from the Build tab." />;
  }

  const manifest = getSiteManifest(ts);
  if (!manifest) {
    return (
      <NotFound message={`No site manifest found for build ${ts}. The output file may have been deleted.`} />
    );
  }

  const currentPage =
    (pageLabel ? manifest.pages.find((p) => p.label === pageLabel) : null) ??
    manifest.pages[0];

  if (!currentPage) {
    return <NotFound message="No pages found in this build's manifest." />;
  }

  const output = getOutputByFile(currentPage.filename);
  if (!output) {
    return (
      <NotFound
        message={`Output file "${currentPage.filename}" not found. The file may have been deleted.`}
      />
    );
  }

  return (
    <>
      <SiteNav manifest={manifest} currentLabel={currentPage.label} />
      {/* Spacer so the fixed nav doesn't overlap the page content */}
      <div className="pt-11">
        <PreviewClient output={output} />
      </div>
    </>
  );
}
