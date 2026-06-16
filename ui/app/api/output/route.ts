import * as fs from "fs";
import * as path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Resolve output/ relative to the ui/ directory (one level up)
    const outputDir = path.resolve(process.cwd(), "../output");

    if (!fs.existsSync(outputDir)) {
      return Response.json({ error: "No output directory found" }, { status: 404 });
    }

    const files = fs
      .readdirSync(outputDir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => ({
        name: f,
        mtime: fs.statSync(path.join(outputDir, f)).mtime.getTime(),
      }))
      .sort((a, b) => b.mtime - a.mtime);

    if (files.length === 0) {
      return Response.json({ error: "No JSON output files found" }, { status: 404 });
    }

    const latest = path.join(outputDir, files[0].name);
    const content = fs.readFileSync(latest, "utf8");
    const data = JSON.parse(content);

    return Response.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
