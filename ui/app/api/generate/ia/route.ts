import { createRequire } from "module";
import * as fs from "fs";
import * as path from "path";
import { DATA_ROOT } from "@/lib/get-output";

// Anchor require resolution to the project root (mode/ui/) so Node.js finds
// mode-agent in mode/ui/node_modules/ regardless of where Turbopack puts
// the compiled file at runtime.
const _require = createRequire(path.resolve(process.cwd(), "__route__"));

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { baseBrief, variantDimension, variantValues, preset } = await req.json();

    const manifestPath = path.join(DATA_ROOT, "manifest/components.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

    const { proposeIA } = _require("mode-agent/ia-planner");

    // Generate IA for every variant value in parallel.
    // Each variant gets a complete brief with its specific dimension value filled in.
    const variants = await Promise.all(
      (variantValues as string[]).map(async (value) => {
        const brief = { ...baseBrief, [variantDimension]: value };
        const ia = await proposeIA(brief, manifest);
        return { label: value, brief, ia, preset };
      })
    );

    return Response.json({ variants });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
