import * as fs from "fs";
import * as path from "path";

export const dynamic = "force-dynamic";

// PUT { ts: string }
// Validates the manifest exists, then writes config/routing.json.
export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as { ts?: string };
    const { ts } = body;

    if (!ts || typeof ts !== "string") {
      return Response.json({ error: "ts is required" }, { status: 400 });
    }

    // Validate that a site manifest for this ts exists in output/
    const outputDir = path.resolve(process.cwd(), "../output");
    const manifestPath = path.join(outputDir, `site-${path.basename(ts)}.json`);
    if (!fs.existsSync(manifestPath)) {
      return Response.json(
        { error: `No manifest found for ts "${ts}". Generate a build first.` },
        { status: 400 }
      );
    }

    // Ensure config/ directory exists (created on first activation)
    const configDir = path.resolve(process.cwd(), "../config");
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    const routingPath = path.join(configDir, "routing.json");
    fs.writeFileSync(routingPath, JSON.stringify({ ts }, null, 2), "utf8");

    return Response.json({ success: true, ts });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
