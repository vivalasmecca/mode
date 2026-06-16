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
  // outputFileTracingRoot must equal turbopack.root (Next.js 16 requirement).
  // Set to ui/ so the tracing root is the same as the Turbopack root.
  // outputFileTracingIncludes paths are relative to this root, so "../"
  // patterns correctly reference sibling directories in the repo.
  outputFileTracingRoot: path.resolve(__dirname),
  outputFileTracingIncludes: {
    "/**": [
      "../output/**",
      "../config/**",
      "../tokens/**",
      "../context/**",
      "../manifest/**",
      "../agent/**",
    ],
  },
};

export default nextConfig;
