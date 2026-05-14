import { ApiError } from "./client";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface ChatProviderInfo {
  available: boolean;
  active: "claude" | "codex" | null;
  claude: boolean;
  codex: boolean;
}

interface StreamChatParams {
  message: string;
  carouselId: string;
  sessionId?: string | null;
  provider?: "claude" | "codex" | null;
  signal?: AbortSignal;
  onSessionId?: (sessionId: string) => void;
  onToken?: (text: string) => void;
  onResult?: (text: string) => void;
  onDone?: (sessionId: string | null) => void;
}

async function getErrorMessage(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };
    if (typeof data.error === "string" && data.error.trim()) {
      return data.error;
    }
  } catch {
    // Fall back to the generic message.
  }

  return `Request failed with status ${response.status}`;
}

function parseSseBlock(block: string): { event: string; data: string } | null {
  const lines = block
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);

  if (lines.length === 0) return null;

  let event = "message";
  const data: string[] = [];

  for (const line of lines) {
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
      continue;
    }
    if (line.startsWith("data:")) {
      data.push(line.slice(5).trimStart());
    }
  }

  return { event, data: data.join("\n") };
}

function handleSseBlock(
  block: string,
  handlers: Pick<
    StreamChatParams,
    "onSessionId" | "onToken" | "onResult" | "onDone"
  >
) {
  const parsed = parseSseBlock(block);
  if (!parsed || !parsed.data) return;

  const payload = JSON.parse(parsed.data) as {
    type?: string;
    text?: string;
    sessionId?: string;
    error?: string;
  };

  if (payload.sessionId) {
    handlers.onSessionId?.(payload.sessionId);
  }

  if (parsed.event === "error") {
    throw new Error(payload.error ?? "AI stream failed");
  }

  if (parsed.event === "done") {
    handlers.onDone?.(payload.sessionId ?? null);
    return;
  }

  if (payload.type === "token" && typeof payload.text === "string") {
    handlers.onToken?.(payload.text);
  }

  if (payload.type === "result" && typeof payload.text === "string") {
    handlers.onResult?.(payload.text);
  }
}

export async function getChatProviders(): Promise<ChatProviderInfo> {
  const response = await fetch("/api/chat/check");
  if (!response.ok) {
    throw new ApiError(await getErrorMessage(response), response.status);
  }
  return response.json() as Promise<ChatProviderInfo>;
}

export async function streamChatMessage({
  message,
  carouselId,
  sessionId,
  provider,
  signal,
  onSessionId,
  onToken,
  onResult,
  onDone,
}: StreamChatParams): Promise<void> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      sessionId: sessionId ?? undefined,
      carouselId,
      provider: provider ?? undefined,
    }),
    signal,
  });

  if (!response.ok) {
    throw new ApiError(await getErrorMessage(response), response.status);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response stream");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split(/\r?\n\r?\n/);
    buffer = blocks.pop() ?? "";

    for (const block of blocks) {
      handleSseBlock(block, { onSessionId, onToken, onResult, onDone });
    }
  }

  if (buffer.trim()) {
    handleSseBlock(buffer, { onSessionId, onToken, onResult, onDone });
  }
}
