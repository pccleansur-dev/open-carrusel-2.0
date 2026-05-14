import { spawn } from "child_process";
import crossSpawn from "cross-spawn";
import { findCodexPath } from "@/lib/codex-path";
import { encodeDone, encodeError, encodeResult, encodeToken } from "./sse";
import type { ChatAdapterParams } from "./types";

function handleCodexEvent(
  event: Record<string, unknown>,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  onThreadId: (id: string) => void,
  onText: (text: string) => void
) {
  if (event.type === "thread.started" && typeof event.thread_id === "string") {
    onThreadId(event.thread_id);
    return;
  }

  if (event.type === "item.completed") {
    const item = event.item as Record<string, unknown> | undefined;
    if (item?.type === "agent_message" && typeof item.text === "string") {
      controller.enqueue(encodeToken(encoder, item.text));
      onText(item.text);
    }
  }
}

export function streamWithCodex({
  message,
  systemPrompt,
  controller,
  encoder,
  abortSignal,
}: ChatAdapterParams) {
  const codexPath = findCodexPath();
  if (!codexPath) {
    controller.enqueue(encodeError(encoder, { error: "Failed to start Codex CLI" }));
    controller.close();
    return;
  }

  const model = process.env.CODEX_MODEL;
  const fullPrompt = `${systemPrompt}\n\n---\n\n${message}`;
  const args = [
    "exec",
    "--json",
    "--skip-git-repo-check",
    "-c",
    'sandbox="none"',
  ];

  if (model) args.push("--model", model);
  args.push(fullPrompt);

  const isWindowsShim =
    process.platform === "win32" && /\.(cmd|bat)$/i.test(codexPath);
  const spawner = isWindowsShim ? crossSpawn : spawn;

  let childProcess: ReturnType<typeof spawn>;
  try {
    childProcess = spawner(codexPath, args, {
      cwd: process.cwd(),
      signal: abortSignal,
      stdio: ["pipe", "pipe", "pipe"],
    });
    childProcess.stdin?.end();
  } catch (error) {
    const spawnError = error as NodeJS.ErrnoException;
    controller.enqueue(
      encodeError(encoder, {
        error: "Failed to start Codex CLI",
        code: spawnError?.code,
      })
    );
    controller.close();
    return;
  }

  let buffer = "";
  let threadId = "";
  let lastText = "";
  let stderrBuffer = "";
  const timeout = setTimeout(() => childProcess.kill(), 480_000);

  childProcess.stdout?.on("data", (chunk: Buffer) => {
    buffer += chunk.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        handleCodexEvent(
          JSON.parse(line) as Record<string, unknown>,
          controller,
          encoder,
          (nextThreadId) => {
            threadId = nextThreadId;
          },
          (text) => {
            lastText = text;
          }
        );
      } catch {
        // Skip malformed lines.
      }
    }
  });

  childProcess.stderr?.on("data", (chunk: Buffer) => {
    stderrBuffer = (stderrBuffer + chunk.toString()).slice(-8192);
  });

  childProcess.on("error", (error) => {
    clearTimeout(timeout);
    const processError = error as NodeJS.ErrnoException;
    try {
      controller.enqueue(encodeError(encoder, { error: processError.message }));
      controller.close();
    } catch {
      // Stream already closed.
    }
  });

  childProcess.on("exit", (code) => {
    clearTimeout(timeout);

    if (code && code !== 0) {
      try {
        controller.enqueue(
          encodeError(encoder, {
            error: `Codex CLI exited with code ${code}`,
            exitCode: code,
            stderr: stderrBuffer || undefined,
          })
        );
      } catch {
        // Stream already closed.
      }
    }

    if (lastText) {
      try {
        controller.enqueue(encodeResult(encoder, lastText, threadId));
      } catch {
        // Stream already closed.
      }
    }

    try {
      controller.enqueue(encodeDone(encoder, threadId, code));
      controller.close();
    } catch {
      // Stream already closed.
    }
  });
}
