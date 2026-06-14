import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Never bundle these — Node.js resolves them at runtime.
  // mode-agent is the local agent package (symlinked via file: dependency).
  // @anthropic-ai/sdk lives in mode/node_modules, not mode/ui/node_modules.
  serverExternalPackages: ["@anthropic-ai/sdk", "mode-agent"],
  turbopack: {
    // Explicitly set root to mode/ui/ so Turbopack doesn't auto-detect
    // mode/ from mode/package-lock.json and break Next.js module resolution.
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
