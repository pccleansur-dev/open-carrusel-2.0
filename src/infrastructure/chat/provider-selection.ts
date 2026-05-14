import { isClaudeAvailable } from "@/lib/claude-path";
import { isCodexAvailable } from "@/lib/codex-path";
import type { ChatProvider } from "@/contracts/chat";

export interface ChatProviderInfo {
  available: boolean;
  active: ChatProvider | null;
  claude: boolean;
  codex: boolean;
}

function getConfiguredProvider(): string {
  return (process.env.AI_PROVIDER ?? "auto").toLowerCase();
}

export function getChatProviderInfo(
  requested?: ChatProvider
): ChatProviderInfo {
  const claude = isClaudeAvailable();
  const codex = isCodexAvailable();
  const configured = requested ?? (getConfiguredProvider() as ChatProvider | "auto");

  let active: ChatProvider | null = null;
  if (configured === "codex") {
    active = codex ? "codex" : null;
  } else if (configured === "claude") {
    active = claude ? "claude" : null;
  } else {
    active = claude ? "claude" : codex ? "codex" : null;
  }

  return {
    available: active !== null,
    active,
    claude,
    codex,
  };
}

export function resolveChatProvider(requested?: ChatProvider): ChatProvider | null {
  return getChatProviderInfo(requested).active;
}
