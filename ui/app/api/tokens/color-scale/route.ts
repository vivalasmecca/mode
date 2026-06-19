import * as fs from "fs";
import * as path from "path";
import { DATA_ROOT } from "@/lib/get-output";

export const dynamic = "force-dynamic";

/**
 * PUT /api/tokens/color-scale
 * Body: the full color scale object (top-level strings + hue groups).
 * Merges into tokens/color-scale.json, preserving _note and _source metadata.
 */
export async function PUT(req: Request) {
  try {
    const body = await req.json() as Record<string, unknown>;
    const filepath = path.join(DATA_ROOT, "tokens", "color-scale.json");
    const existing = JSON.parse(fs.readFileSync(filepath, "utf8")) as Record<string, unknown>;

    // Start from existing to preserve _note and _source, then overwrite scale entries
    const merged: Record<string, unknown> = { ...existing };
    for (const [key, value] of Object.entries(body)) {
      if (key.startsWith("_")) continue; // never overwrite metadata keys
      if (typeof value === "string") {
        merged[key] = value;
      } else if (typeof value === "object" && value !== null) {
        merged[key] = {
          ...(typeof existing[key] === "object" ? existing[key] as Record<string, string> : {}),
          ...(value as Record<string, string>),
        };
      }
    }

    fs.writeFileSync(filepath, JSON.stringify(merged, null, 2) + "\n");
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
