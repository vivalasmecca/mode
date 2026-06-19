import * as fs from "fs";
import * as path from "path";
import { DATA_ROOT } from "@/lib/get-output";

/**
 * PUT /api/tokens/theme
 * Body: { palette_modes, accent } — scale references, e.g. "gray.900"
 * Merges into tokens/theme.json, preserving _note and _description fields.
 */
export async function PUT(req: Request) {
  try {
    const { palette_modes, accent } = await req.json();
    const filepath = path.join(DATA_ROOT, "tokens", "theme.json");
    const existing = JSON.parse(fs.readFileSync(filepath, "utf8"));

    const merged = {
      ...existing,
      palette_modes: {
        light:   { ...existing.palette_modes.light,   ...palette_modes.light },
        neutral: { ...existing.palette_modes.neutral, ...palette_modes.neutral },
        dark:    { ...existing.palette_modes.dark,    ...palette_modes.dark },
      },
      accent: {
        ...existing.accent,
        on_light: { ...existing.accent.on_light, ...accent.on_light },
        on_dark:  { ...existing.accent.on_dark,  ...accent.on_dark },
      },
    };

    fs.writeFileSync(filepath, JSON.stringify(merged, null, 2) + "\n");
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
