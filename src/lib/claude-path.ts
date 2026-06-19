import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";

export interface ClaudeAuthStatus {
  available: boolean;
  authenticated: boolean;
  authMethod?: string | null;
  apiKeySource?: string | null;
  message?: string;
  reloginCommand?: string;
  reloginHelpUrl?: string;
}

let cachedProbe:
  | {
      expiresAt: number;
      status: ClaudeAuthStatus;
    }
  | null = null;

function syncDockerClaudeAuth(): void {
  if (process.platform === "win32") return;

  const hostClaudeJson = "/run/claude-host/claude.json";
  const hostClaudeDir = "/run/claude-host/claude-dir";
  const targetClaudeJson = "/root/.claude.json";
  const targetClaudeDir = "/root/.claude";

  try {
    if (fs.existsSync(hostClaudeJson)) {
      fs.copyFileSync(hostClaudeJson, targetClaudeJson);
    }

    if (fs.existsSync(hostClaudeDir)) {
      fs.mkdirSync(targetClaudeDir, { recursive: true });
      fs.cpSync(hostClaudeDir, targetClaudeDir, {
        recursive: true,
        force: true,
      });
    }
  } catch {
    // Best-effort sync: auth status below will return a user-facing error.
  }
}

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

export function getClaudeAuthStatus(): ClaudeAuthStatus {
  syncDockerClaudeAuth();

  const claudePath = findClaudePath();
  if (!claudePath) {
    return {
      available: false,
      authenticated: false,
      message:
        "Claude CLI no esta instalado o no se encuentra en este entorno.",
      reloginCommand: "claude auth login",
      reloginHelpUrl: "https://docs.anthropic.com/en/docs/claude-code",
    };
  }

  try {
    const result = spawnSync(claudePath, ["auth", "status", "--json"], {
      encoding: "utf-8",
      timeout: 5000,
      windowsHide: true,
    });

    if (result.status !== 0) {
      return {
        available: true,
        authenticated: false,
        message: "No se pudo verificar la sesion de Claude. Volve a iniciar sesion.",
        reloginCommand: "claude auth login",
        reloginHelpUrl: "https://docs.anthropic.com/en/docs/claude-code",
      };
    }

    const parsed = JSON.parse(result.stdout || "{}") as {
      loggedIn?: boolean;
      authMethod?: string | null;
      apiKeySource?: string | null;
    };

    if (!parsed.loggedIn) {
      return {
        available: true,
        authenticated: false,
        authMethod: parsed.authMethod ?? null,
        apiKeySource: parsed.apiKeySource ?? null,
        message: "Claude no tiene una sesion activa. Reautenticate antes de usar el chat.",
        reloginCommand: "claude auth login",
        reloginHelpUrl: "https://docs.anthropic.com/en/docs/claude-code",
      };
    }

    return {
      available: true,
      authenticated: true,
      authMethod: parsed.authMethod ?? null,
      apiKeySource: parsed.apiKeySource ?? null,
      message: "",
      reloginCommand: "claude auth login",
      reloginHelpUrl: "https://docs.anthropic.com/en/docs/claude-code",
    };
  } catch {
    return {
      available: true,
      authenticated: false,
      message: "No se pudo validar la autenticacion de Claude.",
      reloginCommand: "claude auth login",
      reloginHelpUrl: "https://docs.anthropic.com/en/docs/claude-code",
    };
  }
}

export function getClaudeRuntimeStatus(forceFresh = false): ClaudeAuthStatus {
  const now = Date.now();
  if (!forceFresh && cachedProbe && cachedProbe.expiresAt > now) {
    return cachedProbe.status;
  }

  const baseStatus = getClaudeAuthStatus();
  if (!baseStatus.available || !baseStatus.authenticated) {
    cachedProbe = {
      expiresAt: now + 60_000,
      status: baseStatus,
    };
    return baseStatus;
  }

  const claudePath = findClaudePath();
  if (!claudePath) {
    return baseStatus;
  }

  try {
    const result = spawnSync(
      claudePath,
      [
        "-p",
        "Respond with exactly OK",
        "--output-format",
        "json",
        "--max-budget-usd",
        "0.01",
      ],
      {
        encoding: "utf-8",
        timeout: 12000,
        windowsHide: true,
      }
    );

    const stdout = result.stdout || "";
    const parsed = JSON.parse(stdout || "{}") as {
      is_error?: boolean;
      api_error_status?: number | null;
      result?: string;
      subtype?: string;
      errors?: string[];
    };

    const resultText = String(parsed.result || "").trim();
    const isHealthy =
      (result.status === 0 &&
        parsed.is_error === false &&
        /^OK$/i.test(resultText)) ||
      parsed.subtype === "error_max_budget_usd";

    const status: ClaudeAuthStatus = isHealthy
      ? {
          ...baseStatus,
          message: "",
        }
      : {
          ...baseStatus,
          authenticated: false,
          message:
            parsed.api_error_status === 401 ||
            /not logged in|authenticate/i.test(resultText)
              ? "Claude necesita relogin. Ejecuta `claude auth login` y volve a cargar la app."
              : "Claude no pudo completar una llamada real de prueba. Reautenticate e intenta de nuevo.",
        };

    cachedProbe = {
      expiresAt: now + 60_000,
      status,
    };
    return status;
  } catch {
    const status: ClaudeAuthStatus = {
      ...baseStatus,
      authenticated: false,
      message: "No se pudo ejecutar la prueba real de Claude.",
    };
    cachedProbe = {
      expiresAt: now + 60_000,
      status,
    };
    return status;
  }
}
