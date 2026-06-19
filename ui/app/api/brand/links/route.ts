import * as fs from "fs";
import * as path from "path";
import { DATA_ROOT } from "@/lib/get-output";

export async function PUT(req: Request) {
  try {
    const body = await req.json() as { links: Record<string, string | null> };
    const { links } = body;

    if (!links || typeof links !== "object" || Array.isArray(links)) {
      return Response.json({ error: "Invalid body" }, { status: 400 });
    }

    const filepath = path.join(DATA_ROOT, "context", "product-context.json");
    if (!fs.existsSync(filepath)) {
      return Response.json({ error: "product-context.json not found" }, { status: 404 });
    }

    const ctx = JSON.parse(fs.readFileSync(filepath, "utf8")) as Record<string, unknown>;
    const existing = (ctx.named_links ?? {}) as Record<string, unknown>;
    ctx.named_links = { ...existing, ...links };
    fs.writeFileSync(filepath, JSON.stringify(ctx, null, 2));

    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
