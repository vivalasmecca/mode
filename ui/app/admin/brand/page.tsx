import * as fs from "fs";
import * as path from "path";
import BrandClient from "./BrandClient";

export const dynamic = "force-dynamic";

const contextDir = path.resolve(process.cwd(), "../context");

function readFile(filename: string): string {
  try {
    const filepath = path.join(contextDir, filename);
    if (!fs.existsSync(filepath)) return "";
    return fs.readFileSync(filepath, "utf8");
  } catch {
    return "";
  }
}

export default function BrandPage() {
  const productContextRaw = readFile("product-context.json");
  const brandBrief = readFile("brand-brief.md");

  return (
    <BrandClient
      initialProductContext={productContextRaw}
      initialBrandBrief={brandBrief}
    />
  );
}
