"use client";

import { useEffect, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Hash,
  Loader2,
  MessageSquare,
  Pencil,
  RefreshCw,
  Save,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface CaptionPanelProps {
  carouselId: string;
  caption?: string;
  hashtags?: string[];
  onUpdated?: () => Promise<void> | void;
}

export function CaptionPanel({
  carouselId,
  caption,
  hashtags,
  onUpdated,
}: CaptionPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedHashtags, setCopiedHashtags] = useState(false);
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "regenerating">("idle");
  const [draftCaption, setDraftCaption] = useState(caption ?? "");
  const [draftHashtags, setDraftHashtags] = useState((hashtags ?? []).join(", "));

  useEffect(() => {
    setDraftCaption(caption ?? "");
    setDraftHashtags((hashtags ?? []).join(", "));
  }, [caption, hashtags]);

  const hasContent = (caption && caption.trim()) || (hashtags && hashtags.length > 0);

  if (!hasContent && status === "idle") return null;

  const handleCopy = async (text: string, type: "caption" | "hashtags") => {
    await navigator.clipboard.writeText(text);
    if (type === "caption") {
      setCopiedCaption(true);
      setTimeout(() => setCopiedCaption(false), 2000);
    } else {
      setCopiedHashtags(true);
      setTimeout(() => setCopiedHashtags(false), 2000);
    }
  };

  const saveDraft = async () => {
    setStatus("saving");
    try {
      const parsedHashtags = draftHashtags
        .split(/[,\s]+/)
        .map((tag) => tag.replace(/^#/, "").trim())
        .filter(Boolean);

      const res = await fetch(`/api/carousels/${carouselId}/caption`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption: draftCaption.trim(),
          hashtags: parsedHashtags,
        }),
      });

      if (!res.ok) throw new Error("No se pudo guardar el caption");
      setEditing(false);
      await onUpdated?.();
    } finally {
      setStatus("idle");
    }
  };

  const regenerate = async () => {
    setStatus("regenerating");
    try {
      const res = await fetch(`/api/carousels/${carouselId}/caption`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("No se pudo regenerar el caption");
      setEditing(false);
      await onUpdated?.();
      setExpanded(true);
    } finally {
      setStatus("idle");
    }
  };

  return (
    <div className="border-t border-border bg-surface">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <MessageSquare className="h-3 w-3" />
          Caption & Hashtags
        </span>
        {expanded ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronUp className="h-3 w-3" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-3">
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-[10px]"
              onClick={regenerate}
              disabled={status !== "idle"}
            >
              {status === "regenerating" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              Regenerar
            </Button>
            {!editing ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-[10px]"
                onClick={() => setEditing(true)}
              >
                <Pencil className="h-3 w-3" />
                Editar
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2 text-[10px]"
                  onClick={() => {
                    setEditing(false);
                    setDraftCaption(caption ?? "");
                    setDraftHashtags((hashtags ?? []).join(", "));
                  }}
                  disabled={status !== "idle"}
                >
                  <X className="h-3 w-3" />
                  Cancelar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2 text-[10px]"
                  onClick={saveDraft}
                  disabled={status !== "idle"}
                >
                  {status === "saving" ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Save className="h-3 w-3" />
                  )}
                  Guardar
                </Button>
              </>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-muted-foreground">
                Caption
              </span>
              {!editing && caption && caption.trim() && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 text-[10px] gap-1 px-1.5"
                  onClick={() => handleCopy(caption, "caption")}
                >
                  {copiedCaption ? (
                    <Check className="h-2.5 w-2.5 text-green-500" />
                  ) : (
                    <Copy className="h-2.5 w-2.5" />
                  )}
                  {copiedCaption ? "Copied" : "Copy"}
                </Button>
              )}
            </div>
            {editing ? (
              <textarea
                value={draftCaption}
                onChange={(event) => setDraftCaption(event.target.value)}
                className="min-h-28 w-full rounded-md border border-border bg-background p-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
            ) : (
              <p className="text-xs text-foreground bg-muted rounded-md p-2 whitespace-pre-wrap">
                {caption}
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                <Hash className="h-2.5 w-2.5" />
                Hashtags ({hashtags?.length ?? 0})
              </span>
              {!editing && hashtags && hashtags.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 text-[10px] gap-1 px-1.5"
                  onClick={() =>
                    handleCopy(hashtags.map((tag) => `#${tag}`).join(" "), "hashtags")
                  }
                >
                  {copiedHashtags ? (
                    <Check className="h-2.5 w-2.5 text-green-500" />
                  ) : (
                    <Copy className="h-2.5 w-2.5" />
                  )}
                  {copiedHashtags ? "Copied" : "Copy All"}
                </Button>
              )}
            </div>
            {editing ? (
              <input
                value={draftHashtags}
                onChange={(event) => setDraftHashtags(event.target.value)}
                placeholder="tag1, tag2, tag3"
                className="w-full rounded-md border border-border bg-background p-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
            ) : (
              <div className="flex flex-wrap gap-1">
                {(hashtags ?? []).map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] bg-accent/10 text-accent rounded-full px-2 py-0.5"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
