import { spawn } from "child_process";
import crossSpawn from "cross-spawn";
import { getClaudePath } from "@/lib/claude-path";
import { encodeDone, encodeError, encodeResult, encodeToken } from "./sse";
import type { ChatAdapterParams } from "./types";

function handleClaudeEvent(
  event: Record<string, unknown>,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  onSessionId: (id: string) => void
) {
  if (event.type === "system" && event.subtype === "init" && event.session_id) {
    onSessionId(event.session_id as string);
    return;
  }

  if (event.type === "assistant" && event.message) {
    const message = event.message as Record<string, unknown>;
    if (message.type === "message" && Array.isArray(message.content)) {
      for (const block of message.content) {
        const contentBlock = block as Record<string, unknown>;
        if (contentBlock.type === "text" && typeof contentBlock.text === "string") {
          controller.enqueue(encodeToken(encoder, contentBlock.text));
        }
      }
    }
    return;
  }

  if (event.type === "result") {
    if (event.session_id) onSessionId(event.session_id as string);
    if (typeof event.result === "string" && event.result) {
      controller.enqueue(encodeResult(encoder, event.result, ""));
    }
  }
}

export function streamWithClaude({
  message,
  systemPrompt,
  sessionId,
  controller,
  encoder,
  abortSignal,
}: ChatAdapterParams) {
  const claudePath = getClaudePath();
  const args = [
    "-p",
    message,
    "--output-format",
    "stream-json",
    "--include-partial-messages",
    "--verbose",
    "--append-system-prompt",
    systemPrompt,
    "--allowedTools",
    "Bash",
    "--allowedTools",
    "WebFetch",
    "--allowedTools",
    "Read",
    "--max-budget-usd",
    "1.00",
    "--name",
    "carrusel-chat",
  ];

  if (sessionId) args.push("--resume", sessionId);

  const isWindowsShim =
    process.platform === "win32" && /\.(cmd|bat)$/i.test(claudePath);
  const spawner = isWindowsShim ? crossSpawn : spawn;

  let childProcess: ReturnType<typeof spawn>;
  try {
    childProcess = spawner(claudePath, args, {
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
    });
    childProcess.stdin?.end();
  } catch (error) {
    const spawnError = error as NodeJS.ErrnoException;
    controller.enqueue(
      encodeError(encoder, {
        error: "Failed to start Claude CLI",
        code: spawnError?.code,
      })
    );
    controller.close();
    return;
  }

  let buffer = "";
  let resolvedSessionId = sessionId ?? "";
  let stderrBuffer = "";
  const timeout = setTimeout(() => childProcess.kill(), 480_000);

  // Kill process when the HTTP request is cancelled, without passing signal to spawn
  // (spawn signal has inconsistent behaviour on Windows/MINGW).
  abortSignal?.addEventListener("abort", () => childProcess.kill(), { once: true });

  childProcess.stdout?.on("data", (chunk: Buffer) => {
    buffer += chunk.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        handleClaudeEvent(JSON.parse(line), controller, encoder, (nextSessionId) => {
          resolvedSessionId = nextSessionId;
        });
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
      controller.enqueue(
        encodeError(encoder, {
          error: processError.message,
          stderr: stderrBuffer || undefined,
        })
      );
      controller.close();
    } catch {
      // Stream already closed.
    }
  });

  childProcess.on("exit", (code) => {
    clearTimeout(timeout);

    if (buffer.trim()) {
      try {
        handleClaudeEvent(JSON.parse(buffer), controller, encoder, (nextSessionId) => {
          resolvedSessionId = nextSessionId;
        });
      } catch {
        // Ignore trailing malformed buffer.
      }
    }

    // 143 = SIGTERM (128+15): process was cancelled by abort signal — not an error.
    if (code && code !== 0 && code !== 143) {
      try {
        controller.enqueue(
          encodeError(encoder, {
            error: `Claude CLI exited with code ${code}`,
            exitCode: code,
            stderr: stderrBuffer || undefined,
          })
        );
      } catch {
        // Stream already closed.
      }
    }

    try {
      controller.enqueue(encodeDone(encoder, resolvedSessionId, code));
      controller.close();
    } catch {
      // Stream already closed.
    }
  });
}
