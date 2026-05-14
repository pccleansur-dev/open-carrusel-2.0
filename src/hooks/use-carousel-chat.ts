"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage, ChatProviderInfo } from "@/lib/api/chat";
import { getChatProviders, streamChatMessage } from "@/lib/api/chat";

interface UseCarouselChatOptions {
  carouselId: string;
  onStreamStart?: () => void;
  onStreamEnd?: () => void;
}

function getSessionStorageKey(carouselId: string) {
  return `chat-session-${carouselId}`;
}

function getMessagesStorageKey(carouselId: string) {
  return `chat-messages-${carouselId}`;
}

export function useCarouselChat({
  carouselId,
  onStreamStart,
  onStreamEnd,
}: UseCarouselChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [providerInfo, setProviderInfo] = useState<ChatProviderInfo | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<"claude" | "codex" | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const persistSessionId = useCallback(
    (nextSessionId: string | null) => {
      const key = getSessionStorageKey(carouselId);
      if (nextSessionId) {
        localStorage.setItem(key, nextSessionId);
      } else {
        localStorage.removeItem(key);
      }
    },
    [carouselId]
  );

  const persistMessages = useCallback(
    (nextMessages: ChatMessage[]) => {
      try {
        localStorage.setItem(
          getMessagesStorageKey(carouselId),
          JSON.stringify(nextMessages)
        );
      } catch {
        // Ignore quota and serialization issues.
      }
    },
    [carouselId]
  );

  useEffect(() => {
    let cancelled = false;

    getChatProviders()
      .then((nextProviderInfo) => {
        if (cancelled) return;
        setProviderInfo(nextProviderInfo);
        setSelectedProvider((current) => current ?? nextProviderInfo.active);
      })
      .catch(() => {
        if (cancelled) return;
        setProviderInfo({
          available: false,
          active: null,
          claude: false,
          codex: false,
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const storedSessionId = localStorage.getItem(getSessionStorageKey(carouselId));
    if (storedSessionId) {
      setSessionId(storedSessionId);
    } else {
      setSessionId(null);
    }

    try {
      const storedMessages = localStorage.getItem(getMessagesStorageKey(carouselId));
      setMessages(storedMessages ? (JSON.parse(storedMessages) as ChatMessage[]) : []);
    } catch {
      setMessages([]);
    }
  }, [carouselId]);

  useEffect(() => {
    persistMessages(messages);
  }, [messages, persistMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setSessionId(null);
    persistSessionId(null);
    localStorage.removeItem(getMessagesStorageKey(carouselId));
  }, [carouselId, persistSessionId]);

  const stopGenerating = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const sendMessage = useCallback(
    async (message: string) => {
      if (isStreaming) return;

      setError(null);
      setIsStreaming(true);
      onStreamStart?.();

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: message,
      };
      const assistantMessageId = crypto.randomUUID();

      setMessages((previousMessages) => [
        ...previousMessages,
        userMessage,
        {
          id: assistantMessageId,
          role: "assistant",
          content: "",
        },
      ]);

      abortRef.current = new AbortController();

      try {
        let accumulated = "";

        await streamChatMessage({
          message,
          sessionId,
          carouselId,
          provider: selectedProvider,
          signal: abortRef.current.signal,
          onSessionId: (nextSessionId) => {
            setSessionId(nextSessionId);
            persistSessionId(nextSessionId);
          },
          onToken: (text) => {
            accumulated += text;
            setMessages((previousMessages) =>
              previousMessages.map((chatMessage) =>
                chatMessage.id === assistantMessageId
                  ? { ...chatMessage, content: accumulated }
                  : chatMessage
              )
            );
          },
          onResult: (text) => {
            accumulated = text;
            setMessages((previousMessages) =>
              previousMessages.map((chatMessage) =>
                chatMessage.id === assistantMessageId
                  ? { ...chatMessage, content: accumulated }
                  : chatMessage
              )
            );
          },
        });
      } catch (streamError) {
        if (streamError instanceof Error && streamError.name === "AbortError") {
          return;
        }

        const nextError =
          streamError instanceof Error
            ? streamError.message
            : "An unexpected error occurred";

        setError(nextError);
        setMessages((previousMessages) =>
          previousMessages.filter(
            (chatMessage) =>
              chatMessage.id !== assistantMessageId || chatMessage.content.length > 0
          )
        );
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
        onStreamEnd?.();
      }
    },
    [
      carouselId,
      isStreaming,
      onStreamEnd,
      onStreamStart,
      persistSessionId,
      selectedProvider,
      sessionId,
    ]
  );

  return {
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
  };
}
