import * as fs from "fs";
import * as path from "path";
import { DATA_ROOT } from "@/lib/get-output";

export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { file, sectionIndex, slots } = body as {
      file: unknown;
      sectionIndex: unknown;
      slots: unknown;
    };

    // Validate file
    if (!file || typeof file !== "string") {
      return Response.json({ error: "Missing or invalid file parameter" }, { status: 400 });
    }

    // path.basename prevents directory traversal
    const basename = path.basename(file);

    // Must match page-*.json pattern
    if (!/^page-.+\.json$/.test(basename)) {
      return Response.json({ error: "Invalid file name — must match page-*.json" }, { status: 400 });
    }

    // Validate sectionIndex
    if (
      typeof sectionIndex !== "number" ||
      !Number.isInteger(sectionIndex) ||
      sectionIndex < 0
    ) {
      return Response.json({ error: "Invalid sectionIndex" }, { status: 400 });
    }

    // Validate slots
    if (
      !slots ||
      typeof slots !== "object" ||
      Array.isArray(slots)
    ) {
      return Response.json({ error: "Invalid slots — must be an object" }, { status: 400 });
    }

    const outputDir = path.join(DATA_ROOT, "output");
    const filepath = path.join(outputDir, basename);

    if (!fs.existsSync(filepath)) {
      return Response.json({ error: "File not found" }, { status: 404 });
    }

    const raw = fs.readFileSync(filepath, "utf8");
    const output = JSON.parse(raw) as { page?: unknown[] };

    if (!output.page || !Array.isArray(output.page)) {
      return Response.json({ error: "Output file has no page array" }, { status: 400 });
    }

    if (sectionIndex >= output.page.length) {
      return Response.json(
        { error: `sectionIndex ${sectionIndex} out of range (${output.page.length} sections)` },
        { status: 400 }
      );
    }

    // Merge updated slots into the section
    const section = output.page[sectionIndex] as Record<string, unknown>;
    section.slots = slots;

    fs.writeFileSync(filepath, JSON.stringify(output, null, 2), "utf8");

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
