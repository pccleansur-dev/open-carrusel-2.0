"use client";

import { useEffect, useState, useCallback, useRef, use } from "react";
import { fmtDateTime } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Trash2,
  Grid3X3,
  Bookmark,
  Maximize2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  ExternalLink,
  Copy,
  CalendarClock,
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { CarouselPreview } from "@/components/editor/CarouselPreview";
import { SlideFilmstrip } from "@/components/editor/SlideFilmstrip";
import { AspectRatioSelector } from "@/components/editor/AspectRatioSelector";
import { ExportButton } from "@/components/editor/ExportButton";
import { CaptionPanel } from "@/components/editor/CaptionPanel";
import { FullscreenPreview } from "@/components/editor/FullscreenPreview";
import { PublishButton } from "@/components/editor/PublishButton";
import { ScheduleButton } from "@/components/editor/ScheduleButton";
import type { Carousel, AspectRatio } from "@/types/carousel";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function CarouselEditorPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [carousel, setCarousel] = useState<Carousel | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [claudeAvailable, setClaudeAvailable] = useState(true);
  const [claudeStatusMessage, setClaudeStatusMessage] = useState("");
  const [claudeReloginCommand, setClaudeReloginCommand] = useState("");
  const [claudeReloginHelpUrl, setClaudeReloginHelpUrl] = useState("");
  const [chatOpen, setChatOpen] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSafeZones, setShowSafeZones] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [planningExpanded, setPlanningExpanded] = useState(true);

  // Confirm dialog state
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({ open: false, title: "", description: "", onConfirm: () => {} });

  // Ref for focusing chat input when + button is clicked
  const chatInputRef = useRef<HTMLTextAreaElement | null>(null);

  const refreshClaudeStatus = useCallback(async (forceFresh = false) => {
    try {
      const res = await fetch(
        forceFresh ? "/api/chat/check?force=1" : "/api/chat/check",
        { cache: "no-store" }
      );
      const data: {
        available?: boolean;
        authenticated?: boolean;
        message?: string;
        reloginCommand?: string;
        reloginHelpUrl?: string;
      } = await res.json();
      const ready = data.available !== false && data.authenticated !== false;
      setClaudeAvailable(ready);
      setClaudeStatusMessage(data.message || "");
      setClaudeReloginCommand(data.reloginCommand || "");
      setClaudeReloginHelpUrl(data.reloginHelpUrl || "");
    } catch {
      // ignore and keep current state
    }
  }, []);

  const fetchCarousel = useCallback(async () => {
    try {
      const res = await fetch(`/api/carousels/${id}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setCarousel((prev) => {
          // If new slides were added during generation, jump to the latest slide
          if (prev && data.slides.length > prev.slides.length) {
            setActiveSlide(data.slides.length - 1);
          } else {
            setActiveSlide((prevIdx) =>
              data.slides.length === 0 ? 0 : Math.min(prevIdx, data.slides.length - 1)
            );
          }
          return data;
        });
      }
    } catch {
      // ignore network errors
    }
  }, [id]);

  // Initial data load
  useEffect(() => {
    const load = async () => {
      await fetchCarousel();
      await refreshClaudeStatus();
    };
    load();
  }, [fetchCarousel, refreshClaudeStatus]);

  // Poll for carousel updates while AI is generating slides
  useEffect(() => {
    if (!isGenerating) return;
    const interval = setInterval(() => {
      fetchCarousel();
    }, 500);
    return () => clearInterval(interval);
  }, [isGenerating, fetchCarousel]);

  const handleAspectChange = async (ratio: AspectRatio) => {
    if (!carousel) return;
    const res = await fetch(`/api/carousels/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aspectRatio: ratio }),
    });
    if (res.ok) {
      const updated = await res.json();
      setCarousel(updated);
    }
  };

  const handleDeleteSlide = (slideId: string) => {
    if (!carousel) return;
    const slideIndex = carousel.slides.findIndex((s) => s.id === slideId);
    setConfirmState({
      open: true,
      title: `Delete slide ${slideIndex + 1}?`,
      description: "This action cannot be undone.",
      onConfirm: async () => {
        const res = await fetch(`/api/carousels/${id}/slides/${slideId}`, {
          method: "DELETE",
        });
        if (res.ok) await fetchCarousel();
      },
    });
  };

  const handleUndoSlide = async (slideId: string) => {
    const res = await fetch(`/api/carousels/${id}/slides/${slideId}/undo`, {
      method: "POST",
    });
    if (res.ok) await fetchCarousel();
  };

  const handleDeleteCarousel = useCallback(() => {
    if (!carousel) return;
    setConfirmState({
      open: true,
      title: `Delete "${carousel.name}"?`,
      description: "This will permanently delete the carousel and all its slides.",
      onConfirm: async () => {
        const res = await fetch(`/api/carousels/${id}`, { method: "DELETE" });
        if (res.ok) router.push("/");
      },
    });
  }, [carousel, id, router]);

  const handleStreamStart = useCallback(() => {
    setIsGenerating(true);
  }, []);

  const handleStreamEnd = useCallback(() => {
    setIsGenerating(false);
    fetchCarousel();
  }, [fetchCarousel]);

  const handleReorderSlides = useCallback(
    async (slideIds: string[]) => {
      await fetch(`/api/carousels/${id}/slides`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slideIds }),
      });
      await fetchCarousel();
    },
    [id, fetchCarousel]
  );

  const handleAddSlideRequest = useCallback(() => {
    setChatOpen(true);
    // Focus chat input after a tick (to let panel render)
    setTimeout(() => {
      chatInputRef.current?.focus();
    }, 100);
  }, []);

  if (notFound) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <p className="text-lg font-semibold">Carousel not found</p>
        <p className="text-sm text-muted-foreground">
          This carousel may have been deleted.
        </p>
        <Link href="/" className="text-sm text-accent underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  if (!carousel) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <TopBar
        title={carousel.name}
        showBack
        editable
        onTitleChange={async (name) => {
          const res = await fetch(`/api/carousels/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name }),
          });
          if (res.ok) {
            const updated = await res.json();
            setCarousel(updated);
          }
        }}
      />

      {/* Fullscreen preview */}
      <FullscreenPreview
        open={showFullscreen}
        onOpenChange={setShowFullscreen}
        slides={carousel.slides}
        aspectRatio={carousel.aspectRatio}
        activeIndex={activeSlide}
        onActiveChange={setActiveSlide}
      />

      {/* Confirm dialog */}
      <ConfirmDialog
        open={confirmState.open}
        onOpenChange={(open) => setConfirmState((s) => ({ ...s, open }))}
        title={confirmState.title}
        description={confirmState.description}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={confirmState.onConfirm}
      />

      {/* Main editor area */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Chat panel */}
        {chatOpen && (
          <div className="oc-fade w-80 border-r border-border shrink-0 flex flex-col bg-surface">
            <ChatPanel
              carouselId={id}
              claudeAvailable={claudeAvailable}
              claudeStatusMessage={claudeStatusMessage}
              claudeReloginCommand={claudeReloginCommand}
              claudeReloginHelpUrl={claudeReloginHelpUrl}
              onRetryClaudeCheck={() => refreshClaudeStatus(true)}
              referenceImages={carousel.referenceImages || []}
              onStreamStart={handleStreamStart}
              onStreamEnd={handleStreamEnd}
              chatInputRef={chatInputRef}
            />
          </div>
        )}

        {/* Right side: toolbar + preview */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {carousel.planning ? (
            <div className="border-b border-border bg-amber-50/70 px-4 py-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-900">
                      <CalendarClock className="h-3.5 w-3.5" />
                      Creado desde planning
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPlanningExpanded((current) => !current)}
                      className="h-7 px-2 text-[11px]"
                    >
                      {planningExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      {planningExpanded ? "Replegar" : "Desplegar"}
                    </Button>
                  </div>
                  <h2 className="mt-2 text-sm font-semibold text-foreground">
                    {carousel.planning.title}
                  </h2>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {carousel.planning.status ? (
                      <span>Estado: {carousel.planning.status}</span>
                    ) : null}
                    {carousel.planning.scheduledFor ? (
                      <span>Fecha editorial: {carousel.planning.scheduledFor}</span>
                    ) : null}
                    {carousel.planning.network ? (
                      <span>Red: {carousel.planning.network}</span>
                    ) : null}
                    {carousel.planning.sourceUrl ? (
                      <a
                        href={carousel.planning.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-accent hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Abrir source
                      </a>
                    ) : null}
                  </div>
                  {planningExpanded ? (
                    <div className="oc-fade">
                      {carousel.planning.promptSlides ? (
                        <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                          <span className="font-medium">Prompt:</span> {carousel.planning.promptSlides}
                        </p>
                      ) : null}
                      {carousel.planning.copy ? (
                        <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">Copy:</span> {carousel.planning.copy}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {planningExpanded ? (
                <div className="flex shrink-0 flex-wrap gap-2">
                  {carousel.planning.promptSlides ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        await navigator.clipboard.writeText(carousel.planning?.promptSlides || "");
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copiar prompt
                    </Button>
                  ) : null}
                  {carousel.planning.copy ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        await navigator.clipboard.writeText(carousel.planning?.copy || "");
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copiar copy
                    </Button>
                  ) : null}
                </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Toolbar */}
          <div className="h-11 border-b border-border bg-surface flex items-center px-4 gap-3 shrink-0">
            <AspectRatioSelector
              value={carousel.aspectRatio}
              onChange={handleAspectChange}
            />
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFullscreen(true)}
              className="text-muted-foreground"
              aria-label="Fullscreen preview"
              title="Fullscreen preview"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={showSafeZones ? "outline" : "ghost"}
              size="sm"
              onClick={() => setShowSafeZones(!showSafeZones)}
              className={showSafeZones ? "border-accent text-accent" : "text-muted-foreground"}
              aria-label="Toggle safe zones"
              title="Instagram safe zones"
            >
              <Grid3X3 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await fetch("/api/templates", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ carouselId: carousel.id }),
                });
              }}
              className="text-muted-foreground"
              aria-label="Save as template"
              title="Save as template"
            >
              <Bookmark className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeleteCarousel}
              className="text-muted-foreground hover:text-destructive"
              aria-label="Delete carousel"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md border border-border hover:bg-muted"
            >
              {chatOpen ? "Hide Chat" : "Show Chat"}
            </button>
            <ExportButton
              carouselId={carousel.id}
              slideCount={carousel.slides.length}
            />
            {carousel.postedAt ? (
              <div className="flex items-center gap-2">
                <div
                  className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-700"
                  title={`Publicado el ${fmtDateTime(carousel.postedAt)}`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Publicado</span>
                </div>
                {carousel.publishedPostUrl ? (
                  <a
                    href={carousel.publishedPostUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                    title="Abrir post publicado"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Ver post</span>
                  </a>
                ) : carousel.publishedPostId ? (
                  <span
                    className="max-w-40 truncate text-[11px] font-mono text-muted-foreground"
                    title={carousel.publishedPostId}
                  >
                    {carousel.publishedPostId}
                  </span>
                ) : null}
              </div>
            ) : null}
            <ScheduleButton
              carouselId={carousel.id}
              slideCount={carousel.slides.length}
              hasCaption={!!carousel.caption}
              scheduledAt={carousel.scheduledAt}
              onScheduled={fetchCarousel}
            />
            <PublishButton
              carouselId={carousel.id}
              slideCount={carousel.slides.length}
              hasCaption={!!carousel.caption}
              hasBeenPublished={!!carousel.postedAt}
              isScheduled={!!carousel.scheduledAt}
              onPublished={fetchCarousel}
            />
          </div>

          {/* Carousel preview */}
          <CarouselPreview
            slides={carousel.slides}
            aspectRatio={carousel.aspectRatio}
            activeIndex={activeSlide}
            onActiveChange={setActiveSlide}
            showSafeZones={showSafeZones}
          />

          {/* Caption panel */}
          <CaptionPanel
            carouselId={carousel.id}
            caption={carousel.caption}
            hashtags={carousel.hashtags}
            onUpdated={fetchCarousel}
          />
        </div>
      </div>

      {/* Filmstrip */}
      <SlideFilmstrip
        slides={carousel.slides}
        aspectRatio={carousel.aspectRatio}
        activeIndex={activeSlide}
        onActiveChange={setActiveSlide}
        onDeleteSlide={handleDeleteSlide}
        onUndoSlide={handleUndoSlide}
        onAddSlideRequest={handleAddSlideRequest}
        onReorderSlides={handleReorderSlides}
        isGenerating={isGenerating}
      />
    </div>
  );
}
