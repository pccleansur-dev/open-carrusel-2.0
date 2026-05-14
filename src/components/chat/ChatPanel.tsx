"use client";

import type { RefObject } from "react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { ReferenceImages } from "./ReferenceImages";
import { AlertCircle, Plug } from "lucide-react";
import type { ReferenceImage } from "@/types/carousel";
import { useCarouselChat } from "@/hooks/use-carousel-chat";

interface ChatPanelProps {
  carouselId: string;
  referenceImages?: ReferenceImage[];
  onStreamStart?: () => void;
  onStreamEnd?: () => void;
  chatInputRef?: RefObject<HTMLTextAreaElement | null>;
}

export function ChatPanel({
  carouselId,
  referenceImages = [],
  onStreamStart,
  onStreamEnd,
  chatInputRef,
}: ChatPanelProps) {
  const {
    clearChat,
    error,
    isStreaming,
    messages,
    providerInfo,
    scrollRef,
    selectedProvider,
    sendMessage,
    setSelectedProvider,
    stopGenerating,
  } = useCarouselChat({
    carouselId,
    onStreamStart,
    onStreamEnd,
  });

  if (providerInfo?.available === false) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <Plug className="h-10 w-10 text-muted-foreground mb-3" />
        <h3 className="font-semibold text-sm mb-1">Connect an AI CLI</h3>
        <p className="text-xs text-muted-foreground max-w-[200px]">
          Install Claude CLI or Codex CLI to enable AI-powered carousel creation.{" "}
          <a
            href="https://docs.anthropic.com/en/docs/claude-code"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline"
          >
            Install guide
          </a>
        </p>
      </div>
    );
  }

  const bothAvailable = providerInfo?.claude && providerInfo?.codex;

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-border flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold">AI Assistant</h2>
          <p className="text-xs text-muted-foreground">
            Describe the carousel you want to create
          </p>
        </div>

        <div className="flex items-center gap-2">
          {bothAvailable && selectedProvider && (
            <div className="flex items-center rounded-md border border-border overflow-hidden text-[10px] font-medium">
              <button
                onClick={() => setSelectedProvider("claude")}
                className={`px-2 py-1 transition-colors ${
                  selectedProvider === "claude"
                    ? "bg-accent text-white"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
                title="Use Claude CLI"
              >
                Claude
              </button>
              <button
                onClick={() => setSelectedProvider("codex")}
                className={`px-2 py-1 transition-colors border-l border-border ${
                  selectedProvider === "codex"
                    ? "bg-accent text-white"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
                title="Use Codex CLI"
              >
                Codex
              </button>
            </div>
          )}

          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="text-[10px] text-muted-foreground hover:text-destructive transition-colors px-1.5 py-0.5 rounded"
            >
              Clear
            </button>
          )}
        </div>
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
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            role={message.role}
            content={message.content}
            isStreaming={
              isStreaming &&
              message.role === "assistant" &&
              message.id === messages[messages.length - 1]?.id
            }
          />
        ))}
        {error && (
          <div className="mx-4 my-2 flex items-center gap-2 text-destructive text-xs bg-destructive/10 rounded-lg p-3">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
      </div>

      <ChatInput
        onSend={sendMessage}
        isStreaming={isStreaming}
        textareaRef={chatInputRef}
        onStop={stopGenerating}
      />
    </div>
  );
}
