import { execSync } from "child_process";
import * as path from "path";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (process.env.VERCEL) {
    return Response.json({ error: "Deploy only available in local dev" }, { status: 403 });
  }
  try {
    const { message } = await req.json().catch(() => ({}));
    const repoRoot = path.resolve(process.cwd(), "..");
    execSync("git add output/ config/", { cwd: repoRoot });
    const staged = execSync("git diff --cached --name-only", { cwd: repoRoot }).toString().trim();
    if (!staged) {
      return Response.json({ message: "Nothing new to deploy — already up to date." });
    }
    const commitMsg = message || `Deploy ${new Date().toISOString().slice(0, 16).replace("T", " ")}`;
    execSync(`git commit -m "${commitMsg}"`, { cwd: repoRoot });
    execSync("git push origin main", { cwd: repoRoot });
    return Response.json({ success: true, message: "Pushed. Vercel deployment in progress." });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
