import * as fs from "fs";
import * as path from "path";
import { DATA_ROOT } from "@/lib/get-output";
import type { VariantOverrideDef, VariantOverrideMap } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { key, def } = body as { key: unknown; def: unknown };

    // Validate key: ComponentName.variant-slug format
    if (
      typeof key !== "string" ||
      !/^[A-Za-z][a-zA-Z0-9]*\.[a-z0-9-]+$/.test(key)
    ) {
      return Response.json(
        { error: "Invalid key format — must be ComponentName.variant-slug" },
        { status: 400 }
      );
    }

    if (!def || typeof def !== "object" || Array.isArray(def)) {
      return Response.json({ error: "Invalid def — must be an object" }, { status: 400 });
    }

    const filepath = path.join(DATA_ROOT, "tokens", "variant-overrides.json");

    let existing: VariantOverrideMap = {};
    if (fs.existsSync(filepath)) {
      try {
        existing = JSON.parse(fs.readFileSync(filepath, "utf8")) as VariantOverrideMap;
      } catch {
        existing = {};
      }
    }

    existing[key] = def as VariantOverrideDef;
    fs.writeFileSync(filepath, JSON.stringify(existing, null, 2), "utf8");

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
