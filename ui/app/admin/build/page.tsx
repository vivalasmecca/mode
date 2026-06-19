import BuildClient from "./BuildClient";

export default function BuildPage() {
  return (
    <>
      <div className="flex items-center gap-3 border-b border-red-100 bg-red-50 px-6 py-3">
        <span className="inline-flex flex-shrink-0 items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
          Foundational
        </span>
        <p className="text-xs text-red-700">
          Building regenerates all content from scratch and overwrites any edits made in the Edit tab. Use the Edit tab for targeted changes after a build.
        </p>
      </div>
      <BuildClient />
    </>
  );
}
