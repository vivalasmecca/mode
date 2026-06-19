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
  // Must match turbopack.root — both must point to the same directory.
  // Vercel auto-sets this to the repo root; overriding it here keeps both
  // aligned on mode/ui/ and prevents a hard error in Next.js 16.2+.
  outputFileTracingRoot: path.resolve(__dirname),
  // On Vercel, vercel.json buildCommand pre-copies sibling directories
  // (output/, tokens/, context/, manifest/, config/) into ui/mode-data/
  // before the build runs. outputFileTracingIncludes uses paths within
  // the Turbopack project root (no "../" prefix, which Turbopack forbids).
  outputFileTracingIncludes: {
    "/**": ["mode-data/**"],
  },
};

export default nextConfig;
