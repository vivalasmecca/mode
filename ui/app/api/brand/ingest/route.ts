import { createRequire } from "module";
import * as path from "path";

const _require = createRequire(path.resolve(process.cwd(), "__route__"));

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const { urls }: { urls: string[] } = await req.json();

    if (!Array.isArray(urls) || urls.length === 0) {
      return Response.json({ error: "urls must be a non-empty array" }, { status: 400 });
    }

    const { buildBrandContext } = _require("mode-agent/brand-context-builder");
    const { productContext, brandBrief } = await buildBrandContext(urls);

    return Response.json({ productContext, brandBrief });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
