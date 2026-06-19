import * as fs from "fs";
import * as path from "path";
import { DATA_ROOT } from "@/lib/get-output";

export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { file, sectionIndex, slots, component, variant } = body as {
      file: unknown;
      sectionIndex: unknown;
      slots: unknown;
      component: unknown;
      variant: unknown;
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

    // Must provide at least one of slots or component
    if (slots === undefined && component === undefined) {
      return Response.json({ error: "Must provide slots, component, or both" }, { status: 400 });
    }

    // Validate slots if provided
    if (slots !== undefined && (!slots || typeof slots !== "object" || Array.isArray(slots))) {
      return Response.json({ error: "Invalid slots — must be an object" }, { status: 400 });
    }

    // Validate component if provided
    if (component !== undefined && typeof component !== "string") {
      return Response.json({ error: "Invalid component — must be a string" }, { status: 400 });
    }

    // variant may be string or null; skip validation if not provided
    if (variant !== undefined && variant !== null && typeof variant !== "string") {
      return Response.json({ error: "Invalid variant — must be a string or null" }, { status: 400 });
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

    // Apply updates to the section
    const section = output.page[sectionIndex] as Record<string, unknown>;
    if (slots !== undefined) section.slots = slots;
    if (component !== undefined) section.component = component;
    if (variant !== undefined) section.variant = variant;

    fs.writeFileSync(filepath, JSON.stringify(output, null, 2), "utf8");

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
