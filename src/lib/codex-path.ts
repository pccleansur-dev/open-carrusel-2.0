import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";

function buildCandidates(): string[] {
  const home = os.homedir();
  if (process.platform === "win32") {
    const appData = process.env.APPDATA ?? path.join(home, "AppData", "Roaming");
    return [
      path.join(appData, "npm", "codex.cmd"),
      path.join(appData, "npm", "codex.exe"),
    ];
  }
  return [
    path.join(home, ".local/bin/codex"),
    "/usr/local/bin/codex",
    "/opt/homebrew/bin/codex",
    path.join(home, ".npm-global/bin/codex"),
  ];
}

function probePath(): string | null {
  try {
    const cmd = process.platform === "win32" ? "where" : "command";
    const args = process.platform === "win32" ? ["codex"] : ["-v", "codex"];
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

export function findCodexPath(): string | null {
  if (process.env.CODEX_CLI_PATH && fs.existsSync(process.env.CODEX_CLI_PATH)) {
    return process.env.CODEX_CLI_PATH;
  }
  for (const candidate of buildCandidates()) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return probePath();
}

export function isCodexAvailable(): boolean {
  return findCodexPath() !== null;
}
