#!/usr/bin/env node
// Open Carrusel - environment diagnostic.
// Pure Node, no dependencies, safe to run pre-`npm install`.
// Exit 0 if everything required is OK; exit 1 on any required failure.

import { existsSync, readFileSync, statSync } from "node:fs";
import { execSync } from "node:child_process";
import { homedir, platform } from "node:os";
import { join } from "node:path";

const CHECK = "OK";
const FAIL = "X";
const INFO = "i";
const WARN = "!";

const checks = [];
let hardFailures = 0;

function add(symbol, label, detail, fatal = false) {
  checks.push({ symbol, label, detail });
  if (fatal && symbol === FAIL) hardFailures += 1;
}

function tryExec(cmd) {
  try {
    return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return null;
  }
}

function readLocalEnvFile() {
  try {
    const raw = readFileSync(".env.local", "utf-8");
    const entries = {};
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      let value = trimmed.slice(idx + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      entries[key] = value;
    }
    return entries;
  } catch {
    return {};
  }
}

function resolveConfiguredDir(value, fallback) {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;
  if (/^(?:[A-Za-z]:[\\/]|\\\\|\/)/.test(trimmed)) return trimmed;
  return join(process.cwd(), trimmed);
}

// 1. Node version
const major = Number(process.versions.node.split(".")[0]);
if (major >= 20) {
  add(CHECK, "Node", `v${process.versions.node}`);
} else {
  add(FAIL, "Node", `v${process.versions.node} (need >=20 - install from https://nodejs.org)`, true);
}

// 2. Claude CLI
const localEnv = readLocalEnvFile();
const claudeEnv = process.env.CLAUDE_CLI_PATH ?? localEnv.CLAUDE_CLI_PATH;
const candidates = [
  claudeEnv,
  join(homedir(), ".local/bin/claude"),
  "/usr/local/bin/claude",
  "/opt/homebrew/bin/claude",
  join(homedir(), ".npm-global/bin/claude"),
].filter(Boolean);

let claudePath = null;
const which = tryExec(platform() === "win32" ? "where claude" : "command -v claude");
if (which) claudePath = which.split("\n")[0];
if (!claudePath) {
  for (const c of candidates) {
    if (existsSync(c)) {
      claudePath = c;
      break;
    }
  }
}
if (claudePath) {
  add(CHECK, "Claude CLI", claudePath);
} else {
  add(FAIL, "Claude CLI", "not found - install from https://docs.anthropic.com/en/docs/claude-code", true);
}

// 3. Dependencies
if (existsSync("node_modules") && statSync("node_modules").isDirectory()) {
  add(CHECK, "Dependencies", "node_modules present");
} else {
  add(FAIL, "Dependencies", "node_modules missing - run `/start` or `npm install`", true);
}

// 4. Data files
const dataDir = resolveConfiguredDir(
  process.env.OC_DATA_DIR ?? localEnv.OC_DATA_DIR,
  "data"
);
const dataFiles = ["brand.json", "carousels.json", "templates.json", "staged-actions.json", "style-presets.json"];
const missingData = dataFiles.filter((f) => !existsSync(join(dataDir, f)));
if (missingData.length === 0) {
  add(CHECK, "Data files", `all 5 seeded (${dataDir})`);
} else if (missingData.length === dataFiles.length) {
  add(FAIL, "Data files", `none seeded in ${dataDir} - run \`/start\` or \`npm run setup\``, true);
} else {
  add(WARN, "Data files", `${missingData.length} missing in ${dataDir}: ${missingData.join(", ")} - run /start`);
}

// 5. Port 3000
let portStatus = "free";
let portFree = true;
if (platform() !== "win32") {
  const pid = tryExec("lsof -ti :3000");
  if (pid) {
    portStatus = `in use by PID ${pid.split("\n")[0]} - \`/stop\` to kill`;
    portFree = false;
  }
} else {
  const out = tryExec("netstat -ano -p tcp");
  if (out && /:3000\s+.+LISTENING/i.test(out)) {
    portStatus = "in use (run `netstat -ano | findstr :3000` for details)";
    portFree = false;
  }
}
add(portFree ? CHECK : INFO, "Port 3000", portStatus);

// Output
const labelWidth = Math.max(...checks.map((c) => c.label.length));
console.log("");
for (const { symbol, label, detail } of checks) {
  console.log(`  ${symbol}  ${label.padEnd(labelWidth)}   ${detail}`);
}
console.log("");

if (hardFailures > 0) {
  console.log(`  ${hardFailures} required check${hardFailures > 1 ? "s" : ""} failed.`);
  process.exit(1);
} else {
  process.exit(0);
}
