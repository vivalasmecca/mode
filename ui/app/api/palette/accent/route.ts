import * as fs from "fs";
import * as path from "path";
import { DATA_ROOT } from "@/lib/get-output";

export const dynamic = "force-dynamic";

export async function PUT(req: Request) {
  try {
    const { accent }: { accent: { on_light: { bg: string; text: string }; on_dark: { bg: string; text: string } } } =
      await req.json();

    if (!accent?.on_light || !accent?.on_dark) {
      return Response.json({ error: "accent.on_light and accent.on_dark are required" }, { status: 400 });
    }

    const themePath = path.join(DATA_ROOT, "tokens/theme.json");
    const theme = JSON.parse(fs.readFileSync(themePath, "utf8"));

    // Preserve the note, only update the values.
    theme.accent = {
      _note: theme.accent?._note,
      on_light: accent.on_light,
      on_dark: accent.on_dark,
    };

    fs.writeFileSync(themePath, JSON.stringify(theme, null, 2));

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
