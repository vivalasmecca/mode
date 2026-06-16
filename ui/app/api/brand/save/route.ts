import * as fs from "fs";
import * as path from "path";

export const dynamic = "force-dynamic";

const contextDir = path.resolve(process.cwd(), "../context");

export async function PUT(req: Request) {
  try {
    const {
      productContext,
      brandBrief,
    }: { productContext?: unknown; brandBrief?: string } = await req.json();

    if (!fs.existsSync(contextDir)) {
      fs.mkdirSync(contextDir, { recursive: true });
    }

    if (productContext !== undefined) {
      fs.writeFileSync(
        path.join(contextDir, "product-context.json"),
        JSON.stringify(productContext, null, 2)
      );
    }

    if (brandBrief !== undefined) {
      fs.writeFileSync(path.join(contextDir, "brand-brief.md"), brandBrief);
    }

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
