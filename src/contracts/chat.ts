import { ValidationError } from "@/application/errors";
import { isRecord, parseOptionalString, parseRequiredString } from "./shared";

export type ChatProvider = "claude" | "codex";

export interface ChatRequestInput {
  message: string;
  sessionId?: string;
  carouselId?: string;
  stylePresetId?: string;
  provider?: ChatProvider;
}

export function parseChatRequestInput(body: unknown): ChatRequestInput {
  if (!isRecord(body)) {
    throw new ValidationError("Invalid JSON");
  }

  const message = parseRequiredString(body.message, "message");
  if (message.length > 10000) {
    throw new ValidationError("Invalid message");
  }

  const provider = parseOptionalString(body.provider, "provider");
  if (provider && provider !== "claude" && provider !== "codex") {
    throw new ValidationError("provider must be claude or codex");
  }

  return {
    message,
    sessionId: parseOptionalString(body.sessionId, "sessionId"),
    carouselId: parseOptionalString(body.carouselId, "carouselId"),
    stylePresetId: parseOptionalString(body.stylePresetId, "stylePresetId"),
    provider: provider as ChatProvider | undefined,
  };
}
