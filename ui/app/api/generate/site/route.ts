import { createRequire } from "module";
import * as fs from "fs";
import * as path from "path";
import { DATA_ROOT } from "@/lib/get-output";

// Anchor require resolution to the project root (mode/ui/) so Node.js finds
// mode-agent in mode/ui/node_modules/ regardless of where Turbopack places
// the compiled file at runtime.
const _require = createRequire(path.resolve(process.cwd(), "__route__"));

export const dynamic = "force-dynamic";
export const maxDuration = 300; // multi-page, multi-variant = many LLM calls

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({})) as { configFile?: string };
    // Validate filename to prevent path traversal: must match site*.json
    const configFilename =
      body.configFile && /^site[\w-]*\.json$/.test(body.configFile)
        ? body.configFile
        : "site.json";
    const siteConfigPath = path.join(DATA_ROOT, "config", configFilename);
    if (!fs.existsSync(siteConfigPath)) {
      return Response.json(
        { error: `${configFilename} not found — create it to enable site builds` },
        { status: 400 }
      );
    }
    const siteConfig = JSON.parse(fs.readFileSync(siteConfigPath, "utf8"));

    const { buildSite } = _require("mode-agent/site-builder");
    const { ts, siteManifest } = await buildSite(siteConfig, { dataRoot: DATA_ROOT });

    return Response.json({
      success: true,
      ts,
      siteUrl: `/admin/site?ts=${ts}`,
      pageCount: siteManifest.pages.length,
    });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
