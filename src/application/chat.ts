import { getBrand } from "@/lib/repositories/brand-repository";
import { getCarousel } from "@/lib/repositories/carousels-repository";
import { buildSystemPrompt } from "@/lib/chat-system-prompt";
import { getPreset } from "@/lib/repositories/style-presets-repository";
import type { ChatRequestInput, ChatProvider } from "@/contracts/chat";
import { ServiceUnavailableError } from "./errors";
import {
  getChatProviderInfo,
  resolveChatProvider,
  type ChatProviderInfo,
} from "@/infrastructure/chat/provider-selection";
import { streamWithClaude } from "@/infrastructure/chat/claude-adapter";
import { streamWithCodex } from "@/infrastructure/chat/codex-adapter";
import { createSseResponse } from "@/infrastructure/chat/sse";

export interface ChatStreamContext {
  provider: ChatProvider;
  systemPrompt: string;
}

export async function getChatProviderStatus(
  requested?: ChatProvider
): Promise<ChatProviderInfo> {
  return getChatProviderInfo(requested);
}

export async function buildChatStreamContext(
  input: ChatRequestInput
): Promise<ChatStreamContext> {
  const provider = resolveChatProvider(input.provider);
  if (!provider) {
    throw new ServiceUnavailableError(
      "No AI CLI found. Install Claude CLI or Codex CLI, or set AI_PROVIDER in .env.local"
    );
  }

  const brand = await getBrand();
  const carousel = input.carouselId ? await getCarousel(input.carouselId) : null;
  const stylePreset = input.stylePresetId ? await getPreset(input.stylePresetId) : null;

  return {
    provider,
    systemPrompt: buildSystemPrompt(brand, carousel, stylePreset),
  };
}

export function createChatStreamResponse(
  input: ChatRequestInput,
  context: ChatStreamContext
) {
  const abortController = new AbortController();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const params = {
        message: input.message,
        systemPrompt: context.systemPrompt,
        sessionId: input.sessionId,
        controller,
        encoder,
        abortSignal: abortController.signal,
      };

      if (context.provider === "claude") {
        streamWithClaude(params);
      } else {
        streamWithCodex(params);
      }
    },
    cancel() {
      abortController.abort();
    },
  });

  return createSseResponse(stream);
}
