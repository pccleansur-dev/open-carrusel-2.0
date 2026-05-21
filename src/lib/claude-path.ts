import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";

function normalizeClaudeExecutable(candidate: string): string {
  if (!candidate) return candidate;

  if (process.platform === "win32" && /\.cmd$/i.test(candidate)) {
    const exeCandidate = path.join(
      path.dirname(candidate),
      "node_modules",
      "@anthropic-ai",
      "claude-code",
      "bin",
      "claude.exe"
    );
    if (fs.existsSync(exeCandidate)) {
      return exeCandidate;
    }
  }

  return candidate;
}

function buildCandidates(): string[] {
  const home = os.homedir();
  const candidates: string[] = [];

  if (process.platform === "win32") {
    const appData = process.env.APPDATA ?? path.join(home, "AppData", "Roaming");
    const localAppData =
      process.env.LOCALAPPDATA ?? path.join(home, "AppData", "Local");

    candidates.push(
      path.join(appData, "npm", "claude.cmd"),
      path.join(appData, "npm", "claude.exe"),
      path.join(localAppData, "Programs", "claude", "claude.exe"),
      path.join(home, "AppData", "Roaming", "npm", "claude.cmd")
    );
  } else {
    candidates.push(
      path.join(home, ".local/bin/claude"),
      "/usr/local/bin/claude",
      "/opt/homebrew/bin/claude",
      path.join(home, ".npm-global/bin/claude")
    );
  }

  return candidates;
}

function probePath(): string | null {
  try {
    const cmd = process.platform === "win32" ? "where" : "command";
    const args = process.platform === "win32" ? ["claude"] : ["-v", "claude"];
    const result = spawnSync(cmd, args, {
      encoding: "utf-8",
      shell: process.platform !== "win32",
      timeout: 2000,
    });
    if (result.status === 0 && result.stdout) {
      const first = result.stdout.split(/\r?\n/).find((l) => l.trim());
      if (first && fs.existsSync(first.trim())) return first.trim();
    }
  } catch {
    // ignore
  }
  return null;
}

export function findClaudePath(): string | null {
  if (process.env.CLAUDE_CLI_PATH && fs.existsSync(process.env.CLAUDE_CLI_PATH)) {
    return normalizeClaudeExecutable(process.env.CLAUDE_CLI_PATH);
  }
  for (const candidate of buildCandidates()) {
    if (fs.existsSync(candidate)) return normalizeClaudeExecutable(candidate);
  }
  const probed = probePath();
  return probed ? normalizeClaudeExecutable(probed) : null;
}

export function getClaudePath(): string {
  const found = findClaudePath();
  if (found) return found;
  throw new Error(
    "Claude CLI not found. Install it from https://docs.anthropic.com/en/docs/claude-code or set CLAUDE_CLI_PATH in .env.local"
  );
}

export function isClaudeAvailable(): boolean {
  return findClaudePath() !== null;
}
