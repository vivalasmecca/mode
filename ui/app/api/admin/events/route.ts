import * as fs from "fs";
import * as path from "path";
import { DATA_ROOT } from "@/lib/get-output";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/admin/events
 * Clears the routing activity log (output/events.jsonl).
 */
export async function DELETE() {
  try {
    const filepath = path.join(DATA_ROOT, "output", "events.jsonl");
    if (fs.existsSync(filepath)) {
      fs.writeFileSync(filepath, "", "utf8");
    }
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
