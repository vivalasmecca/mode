import { createRequire } from "module";
import * as fs from "fs";
import * as path from "path";
import { DATA_ROOT } from "@/lib/get-output";

const _require = createRequire(path.resolve(process.cwd(), "__route__"));

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/generate/section
 *
 * Generates slot content for a single new section to be inserted into an
 * existing page. Uses the source file's brief, behavioral tokens, and IA as
 * context so the new section is tonally coherent with the rest of the page.
 *
 * Input:  { file: string, section: PageSection (stub with null slots) }
 * Output: { slots: ComponentSlots }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json() as { file?: unknown; section?: unknown };
    const { file, section } = body;

    if (!file || typeof file !== "string") {
      return Response.json({ error: "file is required" }, { status: 400 });
    }
    if (!section || typeof section !== "object" || Array.isArray(section)) {
      return Response.json({ error: "section object is required" }, { status: 400 });
    }

    const basename = path.basename(file);
    if (!/^page-.+\.json$/.test(basename)) {
      return Response.json({ error: "Invalid file name" }, { status: 400 });
    }

    const filepath = path.join(DATA_ROOT, "output", basename);
    if (!fs.existsSync(filepath)) {
      return Response.json({ error: "File not found" }, { status: 404 });
    }

    const existing = JSON.parse(fs.readFileSync(filepath, "utf8"));
    const manifest = JSON.parse(
      fs.readFileSync(path.join(DATA_ROOT, "manifest/components.json"), "utf8")
    );

    const { populateContent } = _require("mode-agent/content-generator");

    // Run content generation for just this one section.
    // Passing the full existing IA as context keeps copy register coherent.
    const populatedPage = await populateContent(
      existing.ia,
      [section],
      existing.brief,
      manifest,
      existing.behavioral_tokens ?? null
    );

    const slots = populatedPage[0]?.slots ?? {};
    return Response.json({ slots });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
