/**
 * Deployer — abstraction layer for pushing committed config to the buyer's repo.
 *
 * Current implementation: LocalGitDeployer
 *   Runs git shell commands via execSync. Works only when the dashboard is
 *   running locally with git credentials configured. Not suitable for a hosted
 *   SaaS environment.
 *
 * Future implementation: GitHubApiDeployer
 *   Uses the GitHub REST API (Octokit) with an OAuth token. Required for the
 *   hosted control plane model. Replaces this implementation without changing
 *   the deploy route or any callers.
 *
 * To swap implementations: change the export at the bottom of this file.
 * The route at app/api/admin/deploy/route.ts calls deployer.push() only —
 * it has no knowledge of which implementation is active.
 */

import { execSync } from "child_process";
import * as path from "path";

export interface DeployResult {
  success: boolean;
  message: string;
  nothingToCommit?: boolean;
}

export interface Deployer {
  /**
   * Stage content files, commit, and push to the remote.
   * Returns a DeployResult describing the outcome.
   */
  push(commitMessage: string): Promise<DeployResult>;
}

// ─── Local git implementation (current) ─────────────────────────────────────

class LocalGitDeployer implements Deployer {
  private repoRoot: string;

  constructor(repoRoot: string) {
    this.repoRoot = repoRoot;
  }

  async push(commitMessage: string): Promise<DeployResult> {
    const opts = { cwd: this.repoRoot };
    execSync("git add output/ config/", opts);
    const staged = execSync("git diff --cached --name-only", opts).toString().trim();
    if (!staged) {
      return { success: true, nothingToCommit: true, message: "Nothing new to deploy — already up to date." };
    }
    execSync(`git commit -m "${commitMessage}"`, opts);
    execSync("git push origin main", opts);
    return { success: true, message: "Pushed. Vercel deployment in progress." };
  }
}

// ─── Future: GitHubApiDeployer ───────────────────────────────────────────────
//
// class GitHubApiDeployer implements Deployer {
//   Requires: GitHub OAuth token, owner + repo from config.
//   Uses the Git Data API for an atomic multi-file commit:
//     GET  /repos/{owner}/{repo}/git/ref/heads/{branch}  → HEAD SHA
//     GET  /repos/{owner}/{repo}/git/commits/{sha}       → tree SHA
//     POST /repos/{owner}/{repo}/git/blobs               → blob SHA per file
//     POST /repos/{owner}/{repo}/git/trees               → new tree SHA
//     POST /repos/{owner}/{repo}/git/commits             → new commit SHA
//     PATCH /repos/{owner}/{repo}/git/refs/heads/{branch} → update ref
//   See open decisions #3 and #4 in CLAUDE.md before building this.
// }

// ─── Active implementation ───────────────────────────────────────────────────

const repoRoot = path.resolve(process.cwd(), "..");
export const deployer: Deployer = new LocalGitDeployer(repoRoot);
