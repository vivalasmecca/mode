import * as fs from "fs";
import * as path from "path";
import { DATA_ROOT } from "@/lib/get-output";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const file = searchParams.get("file");
  const sectionParam = searchParams.get("section");
  const sectionIndex = sectionParam !== null ? parseInt(sectionParam, 10) : NaN;

  if (!file || typeof file !== "string") {
    return Response.json({ error: "Missing file parameter" }, { status: 400 });
  }
  const basename = path.basename(file);
  if (!/^page-.+\.json$/.test(basename)) {
    return Response.json({ error: "Invalid file name" }, { status: 400 });
  }
  if (isNaN(sectionIndex) || sectionIndex < 0) {
    return Response.json({ error: "Invalid section parameter" }, { status: 400 });
  }

  const filepath = path.join(DATA_ROOT, "output", basename);
  if (!fs.existsSync(filepath)) {
    return Response.json({ error: "File not found" }, { status: 404 });
  }

  const output = JSON.parse(fs.readFileSync(filepath, "utf8")) as { page?: unknown[] };
  if (!output.page || !Array.isArray(output.page) || sectionIndex >= output.page.length) {
    return Response.json({ error: "Section not found" }, { status: 404 });
  }

  const sec = output.page[sectionIndex] as Record<string, unknown>;
  return Response.json({ slots: sec.slots ?? null });
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { file, action, section, sectionIndex, slots, component, variant, custom_variant } = body as {
      file: unknown;
      action: unknown;
      section: unknown;
      sectionIndex: unknown;
      slots: unknown;
      component: unknown;
      variant: unknown;
      custom_variant: unknown;
    };

    // ── Append action: insert a new section before the footer ────────────────
    if (action === "append") {
      if (!file || typeof file !== "string") {
        return Response.json({ error: "Missing or invalid file parameter" }, { status: 400 });
      }
      if (!section || typeof section !== "object" || Array.isArray(section)) {
        return Response.json({ error: "section object is required for append action" }, { status: 400 });
      }

      const basename = path.basename(file);
      if (!/^page-.+\.json$/.test(basename)) {
        return Response.json({ error: "Invalid file name — must match page-*.json" }, { status: 400 });
      }

      const filepath = path.join(path.join(DATA_ROOT, "output"), basename);
      if (!fs.existsSync(filepath)) {
        return Response.json({ error: "File not found" }, { status: 404 });
      }

      const output = JSON.parse(fs.readFileSync(filepath, "utf8")) as { page?: unknown[] };
      if (!output.page || !Array.isArray(output.page)) {
        return Response.json({ error: "Output file has no page array" }, { status: 400 });
      }

      // Insert before the last section (footer is always last)
      const insertAt = Math.max(0, output.page.length - 1);
      output.page.splice(insertAt, 0, section as Record<string, unknown>);
      fs.writeFileSync(filepath, JSON.stringify(output, null, 2), "utf8");
      return Response.json({ success: true, insertedAt: insertAt });
    }

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

    // Must provide at least one of slots, component, variant, or custom_variant
    if (slots === undefined && component === undefined && variant === undefined && custom_variant === undefined) {
      return Response.json({ error: "Must provide slots, component, variant, or custom_variant" }, { status: 400 });
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

    // custom_variant may be string or null; skip validation if not provided
    if (custom_variant !== undefined && custom_variant !== null && typeof custom_variant !== "string") {
      return Response.json({ error: "Invalid custom_variant — must be a string or null" }, { status: 400 });
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
    const sectionEntry = output.page[sectionIndex] as Record<string, unknown>;
    if (slots !== undefined) sectionEntry.slots = slots;
    if (component !== undefined) sectionEntry.component = component;
    if (variant !== undefined) sectionEntry.variant = variant;
    if (custom_variant !== undefined) sectionEntry.custom_variant = custom_variant;

    fs.writeFileSync(filepath, JSON.stringify(output, null, 2), "utf8");

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
