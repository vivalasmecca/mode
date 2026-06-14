import * as fs from "fs";
import * as path from "path";

export const dynamic = "force-dynamic";

export async function PUT(req: Request) {
  try {
    const { preset, paletteMap }: { preset: string; paletteMap: Record<string, Record<string, string>> } =
      await req.json();

    if (!preset || !paletteMap) {
      return Response.json({ error: "preset and paletteMap are required" }, { status: 400 });
    }

    const tokensPath = path.resolve(process.cwd(), "../tokens/mode-tokens.json");
    const tokens = JSON.parse(fs.readFileSync(tokensPath, "utf8"));

    if (!tokens.presets[preset]) {
      return Response.json({ error: `Unknown preset "${preset}"` }, { status: 400 });
    }

    // Only update the palette_map for the specified preset — everything else untouched.
    tokens.presets[preset].palette_map = paletteMap;

    fs.writeFileSync(tokensPath, JSON.stringify(tokens, null, 2));

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
