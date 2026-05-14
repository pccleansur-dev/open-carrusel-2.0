export interface ChatAdapterParams {
  message: string;
  systemPrompt: string;
  sessionId?: string;
  controller: ReadableStreamDefaultController;
  encoder: TextEncoder;
  abortSignal: AbortSignal;
}
