import { deployer } from "@/lib/deployer";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (process.env.VERCEL) {
    return Response.json({ error: "Deploy only available in local dev" }, { status: 403 });
  }
  try {
    const { message } = await req.json().catch(() => ({}));
    const commitMsg = message || `Deploy ${new Date().toISOString().slice(0, 16).replace("T", " ")}`;
    const result = await deployer.push(commitMsg);
    if (result.nothingToCommit) {
      return Response.json({ message: result.message });
    }
    return Response.json({ success: true, message: result.message });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
