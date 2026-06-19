"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { ReferenceImages } from "./ReferenceImages";
import { AlertCircle, Plug } from "lucide-react";
import type { ReferenceImage } from "@/types/carousel";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatPanelProps {
  carouselId: string;
  referenceImages?: ReferenceImage[];
  claudeAvailable: boolean;
  claudeStatusMessage?: string;
  claudeReloginCommand?: string;
  claudeReloginHelpUrl?: string;
  onRetryClaudeCheck?: () => Promise<void> | void;
  onStreamStart?: () => void;
  onStreamEnd?: () => void;
  chatInputRef?: React.RefObject<HTMLTextAreaElement | null>;
}

export function ChatPanel({
  carouselId,
  claudeAvailable,
  claudeStatusMessage,
  claudeReloginCommand,
  claudeReloginHelpUrl,
  onRetryClaudeCheck,
  referenceImages = [],
  onStreamStart,
  onStreamEnd,
  chatInputRef,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedLoginCommand, setCopiedLoginCommand] = useState(false);
  const [retryingClaudeCheck, setRetryingClaudeCheck] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const autoPromptStartedRef = useRef(false);

  // Load session ID and chat history from localStorage
  useEffect(() => {
    const storedSession = localStorage.getItem(`chat-session-${carouselId}`);
    if (storedSession) setSessionId(storedSession);
    try {
      const storedMessages = localStorage.getItem(`chat-messages-${carouselId}`);
      if (storedMessages) setMessages(JSON.parse(storedMessages));
    } catch {
      // ignore corrupted data
    }
  }, [carouselId]);

  // Persist messages to localStorage
  const persistMessages = useCallback(
    (msgs: Message[]) => {
      try {
        localStorage.setItem(`chat-messages-${carouselId}`, JSON.stringify(msgs));
      } catch {
        // ignore quota errors
      }
    },
    [carouselId]
  );

  const handleClearChat = useCallback(() => {
    setMessages([]);
    setSessionId(null);
    localStorage.removeItem(`chat-messages-${carouselId}`);
    localStorage.removeItem(`chat-session-${carouselId}`);
  }, [carouselId]);

  const handleStopGenerating = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const handleRelogin = useCallback(async () => {
    setCopiedLoginCommand(true);
    try {
      await fetch("/api/relogin", { method: "POST" });
    } finally {
      setTimeout(() => setCopiedLoginCommand(false), 3000);
    }
  }, []);

  const handleRetryClaudeCheck = useCallback(async () => {
    if (!onRetryClaudeCheck) return;
    setRetryingClaudeCheck(true);
    try {
      await onRetryClaudeCheck();
    } finally {
      setRetryingClaudeCheck(false);
    }
  }, [onRetryClaudeCheck]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (claudeAvailable) {
      setError(null);
    }
  }, [claudeAvailable]);

  const handleSend = useCallback(
    async (message: string) => {
      if (isStreaming) return;
      setError(null);
      setIsStreaming(true);
      onStreamStart?.();

      // Add user message
      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: message,
      };
      setMessages((prev) => [...prev, userMsg]);

      // Add empty assistant message for streaming
      const assistantId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "" },
      ]);

      abortRef.current = new AbortController();

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            sessionId,
            carouselId,
          }),
          signal: abortRef.current.signal,
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(
            (err as { error?: string }).error || "Failed to connect to AI"
          );
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let accumulated = "";
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === "token" && typeof data.text === "string") {
                  accumulated += data.text;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? { ...m, content: accumulated }
                        : m
                    )
                  );
                } else if (data.type === "result" && typeof data.text === "string") {
                  accumulated = data.text; // result is the final complete text
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? { ...m, content: accumulated }
                        : m
                    )
                  );
                }
              } catch {
                // skip unparseable
              }
            } else if (line.startsWith("event: done")) {
              // Next line has the done data
            } else if (
              line.startsWith("data: ") &&
              line.includes("sessionId")
            ) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.sessionId) {
                  setSessionId(data.sessionId);
                  localStorage.setItem(
                    `chat-session-${carouselId}`,
                    data.sessionId
                  );
                }
              } catch {
                // skip
              }
            }
          }
        }

        // Parse any remaining buffer for the done event
        if (buffer.trim()) {
          for (const line of buffer.split("\n")) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.sessionId) {
                  setSessionId(data.sessionId);
                  localStorage.setItem(
                    `chat-session-${carouselId}`,
                    data.sessionId
                  );
                }
              } catch {
                // skip
              }
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        const message = err instanceof Error ? err.message : "An unexpected error occurred";
        setError(message);
        // Remove empty assistant message on error
        setMessages((prev) =>
          prev.filter(
            (m) => m.id !== assistantId || m.content.length > 0
          )
        );
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
        // Persist messages after stream completes
        setMessages((prev) => {
          persistMessages(prev);
          return prev;
        });
        onStreamEnd?.();
      }
    },
    [isStreaming, sessionId, carouselId, onStreamStart, onStreamEnd, persistMessages]
  );

  useEffect(() => {
    if (autoPromptStartedRef.current || isStreaming) return;

    const stored = localStorage.getItem(`planning-autostart-${carouselId}`);
    if (!stored) return;

    try {
      const data = JSON.parse(stored) as { prompt?: string };
      if (!data.prompt?.trim()) {
        localStorage.removeItem(`planning-autostart-${carouselId}`);
        return;
      }

      autoPromptStartedRef.current = true;
      localStorage.removeItem(`planning-autostart-${carouselId}`);
      void handleSend(data.prompt);
    } catch {
      localStorage.removeItem(`planning-autostart-${carouselId}`);
    }
  }, [carouselId, handleSend, isStreaming]);

  if (!claudeAvailable) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <Plug className="h-10 w-10 text-muted-foreground mb-3" />
        <h3 className="font-semibold text-sm mb-1">Claude no esta listo</h3>
        <p className="text-xs text-muted-foreground max-w-[240px]">
          {claudeStatusMessage?.trim() || "Claude CLI no esta disponible en este entorno."}
        </p>
        {claudeReloginCommand ? (
          <button
            onClick={() => void handleRelogin()}
            disabled={copiedLoginCommand}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
          >
            {copiedLoginCommand ? "Abriendo terminal..." : "Relogear"}
          </button>
        ) : null}
        {claudeReloginHelpUrl ? (
          <a
            href={claudeReloginHelpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 text-xs text-accent underline"
          >
            Guia de login
          </a>
        ) : null}
        {onRetryClaudeCheck ? (
          <button
            onClick={() => void handleRetryClaudeCheck()}
            disabled={retryingClaudeCheck}
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
          >
            {retryingClaudeCheck ? "Revalidando..." : "Ya hice login, revalidar"}
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-border flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold">AI Assistant</h2>
          <p className="text-xs text-muted-foreground">
            Describe the carousel you want to create
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleClearChat}
            className="text-[10px] text-muted-foreground hover:text-destructive transition-colors px-1.5 py-0.5 rounded"
          >
            Clear
          </button>
        )}
      </div>

      <ReferenceImages
        carouselId={carouselId}
        images={referenceImages}
        onImagesChange={() => onStreamEnd?.()}
      />

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {messages.length === 0 && (
          <div className="p-6 text-center text-muted-foreground">
            <p className="text-sm mb-1">No messages yet</p>
            <p className="text-xs">
              Tell me what carousel you&apos;d like to create
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            role={msg.role}
            content={msg.content}
            isStreaming={
              isStreaming &&
              msg.role === "assistant" &&
              msg.id === messages[messages.length - 1]?.id
            }
          />
        ))}
        {error && (
          <div className="mx-4 my-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
            {(/401|authentication credentials|authenticate/i.test(error) && claudeReloginCommand) ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => void handleRelogin()}
                  disabled={copiedLoginCommand}
                  className="inline-flex items-center gap-2 rounded-md border border-destructive/20 bg-background px-2.5 py-1.5 text-[11px] font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
                >
                  {copiedLoginCommand ? "Abriendo terminal..." : "Relogear"}
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <ChatInput
        onSend={handleSend}
        isStreaming={isStreaming}
        textareaRef={chatInputRef}
        onStop={handleStopGenerating}
      />
    </div>
  );
}
