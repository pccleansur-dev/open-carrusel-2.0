"use client";

import { useState } from "react";
import { Check, Loader2, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PublishButtonProps {
  carouselId: string;
  slideCount: number;
  hasCaption: boolean;
  hasBeenPublished?: boolean;
  isScheduled?: boolean;
  onPublished?: () => Promise<void> | void;
}

type Status = "idle" | "publishing" | "done" | "error";

export function PublishButton({
  carouselId,
  slideCount,
  hasCaption,
  hasBeenPublished = false,
  isScheduled = false,
  onPublished,
}: PublishButtonProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const disabled = slideCount === 0 || status === "publishing";

  const handlePublish = async () => {
    if (disabled) return;

    setStatus("publishing");
    setErrorMsg("");

    try {
      const response = await fetch(`/api/carousels/${carouselId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Publish failed");
      }

      await onPublished?.();
      setStatus("done");
      setTimeout(() => setStatus("idle"), 4000);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Error desconocido");
      setStatus("error");
    }
  };

  const title =
    slideCount === 0
      ? "No hay slides para publicar"
      : !hasCaption
        ? "Se generara un caption automatico antes de publicar"
        : isScheduled
          ? "Publicar ahora sin esperar la hora programada"
          : hasBeenPublished
            ? "Volver a publicar carrusel en Instagram"
            : "Publicar carrusel en Instagram";

  return (
    <div className="relative">
      <Button
        onClick={handlePublish}
        disabled={disabled}
        variant="outline"
        size="sm"
        title={title}
        className="border-pink-500/40 text-pink-500 hover:border-pink-500 hover:bg-pink-500/10 disabled:opacity-40"
      >
        <span key={status} className="oc-enter-pop inline-flex items-center gap-2">
          {status === "publishing" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Publicando...</span>
            </>
          ) : status === "done" ? (
            <>
              <Check className="h-4 w-4" />
              <span>Publicado</span>
            </>
          ) : status === "error" ? (
            <>
              <X className="h-4 w-4" />
              <span>Error</span>
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              <span>
                {hasBeenPublished
                  ? "Repostear IG"
                  : isScheduled
                    ? "Publicar IG ahora"
                    : "Publicar IG"}
              </span>
            </>
          )}
        </span>
      </Button>

      {status === "error" && errorMsg ? (
        <div className="absolute right-0 top-full z-50 mt-1 w-72 rounded-md bg-destructive px-3 py-2 text-xs text-destructive-foreground shadow-lg">
          <div className="flex items-start justify-between gap-2">
            <span className="leading-5">{errorMsg}</span>
            <button
              type="button"
              onClick={() => {
                setErrorMsg("");
                setStatus("idle");
              }}
              className="shrink-0 rounded p-0.5 transition-colors hover:bg-black/10"
              aria-label="Cerrar error"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
