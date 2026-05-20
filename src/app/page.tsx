"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Layers,
  Calendar,
  CalendarClock,
  SlidersHorizontal,
  Trash2,
  Copy,
  CheckCircle2,
  ExternalLink,
  LayoutGrid,
  List,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CreateCarouselDialog } from "@/components/ui/create-carousel-dialog";
import { BrandSetup } from "@/components/brand/BrandSetup";
import { IntegrationsPanel } from "@/components/integrations/IntegrationsPanel";
import { SlideRenderer } from "@/components/editor/SlideRenderer";
import { TemplateGallery } from "@/components/templates/TemplateGallery";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import type { Carousel } from "@/types/carousel";

type DashboardTab = "carousels" | "templates" | "posted";
type CarouselStatusFilter = "all" | "draft" | "scheduled" | "posted";
type CarouselViewMode = "cards" | "list" | "calendar";

function getCarouselStatus(carousel: Carousel): CarouselStatusFilter {
  if (carousel.postedAt) return "posted";
  if (carousel.scheduledAt) return "scheduled";
  return "draft";
}

function formatScheduledAt(value: string) {
  return new Date(value).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getMonthStart(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function getMonthKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth()).padStart(2, "0")}`;
}

function formatCalendarMonth(value: Date) {
  return value.toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });
}

function formatCalendarDay(value: Date) {
  return value.toLocaleDateString("en-CA");
}

export default function DashboardPage() {
  const router = useRouter();
  const {
    brand,
    carousels,
    createCarousel,
    duplicateCarousel,
    loading,
    needsBrandSetup,
    refreshBrand,
    removeCarousel,
  } = useDashboardData();
  const [showBrandSetup, setShowBrandSetup] = useState(false);
  const [showIntegrations, setShowIntegrations] = useState(false);

  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({ open: false, title: "", description: "", onConfirm: () => {} });

  const handleDelete = useCallback((e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    setConfirmState({
      open: true,
      title: `Delete "${name}"?`,
      description: "This will permanently delete the carousel and all its slides.",
      onConfirm: async () => {
        await removeCarousel(id);
      },
    });
  }, [removeCarousel]);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<DashboardTab>("carousels");
  const [carouselStatusFilter, setCarouselStatusFilter] = useState<CarouselStatusFilter>("all");
  const [carouselViewMode, setCarouselViewMode] = useState<CarouselViewMode>("cards");
  const [calendarMonth, setCalendarMonth] = useState(() => getMonthStart(new Date()));
  const postedCarousels = carousels
    .filter((carousel) => !!carousel.postedAt)
    .sort((a, b) => new Date(b.postedAt ?? 0).getTime() - new Date(a.postedAt ?? 0).getTime());
  const filteredCarousels = carousels.filter((carousel) =>
    carouselStatusFilter === "all" ? true : getCarouselStatus(carousel) === carouselStatusFilter
  );
  const scheduledCarousels = carousels
    .filter((carousel) => !!carousel.scheduledAt && !carousel.postedAt)
    .sort((a, b) => new Date(a.scheduledAt ?? 0).getTime() - new Date(b.scheduledAt ?? 0).getTime());
  const firstScheduledAt = scheduledCarousels[0]?.scheduledAt ?? null;
  const activeScheduledCarousels =
    carouselStatusFilter === "scheduled"
      ? filteredCarousels.filter((carousel) => !!carousel.scheduledAt && !carousel.postedAt)
      : [];
  const scheduledByDay = activeScheduledCarousels.reduce<Record<string, Carousel[]>>((acc, carousel) => {
    if (!carousel.scheduledAt) return acc;
    const key = formatCalendarDay(new Date(carousel.scheduledAt));
    acc[key] ??= [];
    acc[key].push(carousel);
    return acc;
  }, {});
  const visibleMonthKey = getMonthKey(calendarMonth);
  const visibleMonthScheduledCount = activeScheduledCarousels.filter((carousel) =>
    carousel.scheduledAt && getMonthKey(new Date(carousel.scheduledAt)) === visibleMonthKey
  ).length;

  useEffect(() => {
    if (carouselStatusFilter !== "scheduled" && carouselViewMode === "calendar") {
      setCarouselViewMode("cards");
    }
  }, [carouselStatusFilter, carouselViewMode]);

  useEffect(() => {
    if (carouselStatusFilter !== "scheduled" || !firstScheduledAt) return;
    setCalendarMonth(getMonthStart(new Date(firstScheduledAt)));
  }, [carouselStatusFilter, firstScheduledAt]);

  const calendarGridStart = new Date(calendarMonth);
  calendarGridStart.setDate(calendarMonth.getDate() - ((calendarMonth.getDay() + 6) % 7));
  const calendarDays = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(calendarGridStart);
    day.setDate(calendarGridStart.getDate() + index);
    return day;
  });
  const todayKey = formatCalendarDay(new Date());

  const handleCreate = useCallback(async (name: string, aspectRatio: string) => {
    const carousel = await createCarousel(name, aspectRatio);
    router.push(`/carousel/${carousel.id}`);
  }, [createCarousel, router]);

  const handleRowKeyDown = useCallback((event: React.KeyboardEvent, id: string) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    router.push(`/carousel/${id}`);
  }, [router]);

  return (
    <div className="h-full flex flex-col">
      <TopBar
        onSettingsClick={() => setShowBrandSetup(true)}
        onIntegrationsClick={() => setShowIntegrations(true)}
      />

      <ConfirmDialog
        open={confirmState.open}
        onOpenChange={(open) => setConfirmState((s) => ({ ...s, open }))}
        title={confirmState.title}
        description={confirmState.description}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={confirmState.onConfirm}
      />

      <CreateCarouselDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreate={handleCreate}
      />

      <BrandSetup
        open={showBrandSetup || needsBrandSetup}
        onComplete={() => {
          setShowBrandSetup(false);
          void refreshBrand().catch(() => {});
        }}
        initialBrand={brand || undefined}
      />

      <IntegrationsPanel
        open={showIntegrations}
        onClose={() => setShowIntegrations(false)}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">Open Carrusel</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Create Instagram carousels with AI
              </p>
            </div>
            <Button onClick={() => setShowCreateDialog(true)} variant="accent">
              <Plus className="h-4 w-4" />
              New Carousel
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 border-b border-border">
            <button
              onClick={() => setActiveTab("carousels")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "carousels"
                  ? "border-accent text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              My Carousels
            </button>
            <button
              onClick={() => setActiveTab("templates")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "templates"
                  ? "border-accent text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Templates
            </button>
            <button
              onClick={() => setActiveTab("posted")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "posted"
                  ? "border-accent text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Posted
            </button>
          </div>

          {activeTab === "templates" ? (
            <TemplateGallery />
          ) : activeTab === "posted" ? (
            loading ? (
              <div className="overflow-hidden rounded-2xl border border-border bg-surface">
                <div className="grid grid-cols-[minmax(0,2fr)_110px_120px_150px_minmax(0,1fr)] gap-4 border-b border-border px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  <span>Carousel</span>
                  <span>Slides</span>
                  <span>Format</span>
                  <span>Posted</span>
                  <span>Instagram</span>
                </div>
                {[1, 2, 3].map((row) => (
                  <div
                    key={row}
                    className="grid grid-cols-[minmax(0,2fr)_110px_120px_150px_minmax(0,1fr)] gap-4 border-b border-border/70 px-5 py-4 last:border-b-0"
                  >
                    <div className="h-10 animate-pulse rounded bg-muted" />
                    <div className="h-10 animate-pulse rounded bg-muted" />
                    <div className="h-10 animate-pulse rounded bg-muted" />
                    <div className="h-10 animate-pulse rounded bg-muted" />
                    <div className="h-10 animate-pulse rounded bg-muted" />
                  </div>
                ))}
              </div>
            ) : postedCarousels.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-surface/60 px-6 py-12 text-center">
                <CheckCircle2 className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
                <h2 className="mb-2 text-lg font-semibold">No posted carousels yet</h2>
                <p className="mx-auto max-w-md text-sm text-muted-foreground">
                  When you publish a carousel successfully, it will appear here with its posting date.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-border bg-surface">
                <div className="grid grid-cols-[minmax(0,2fr)_110px_120px_150px_minmax(0,1fr)] gap-4 border-b border-border px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  <span>Carousel</span>
                  <span>Slides</span>
                  <span>Format</span>
                  <span>Posted</span>
                  <span>Instagram</span>
                </div>
                {postedCarousels.map((carousel) => (
                  <div
                    key={carousel.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/carousel/${carousel.id}`)}
                    onKeyDown={(event) => handleRowKeyDown(event, carousel.id)}
                    className="grid w-full cursor-pointer grid-cols-[minmax(0,2fr)_110px_120px_150px_minmax(0,1fr)] gap-4 border-b border-border/70 px-5 py-4 text-left transition-colors hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset last:border-b-0"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold">{carousel.name}</span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" />
                          Posted
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        <span>Updated {new Date(carousel.updatedAt).toLocaleDateString()}</span>
                        <span>{carousel.caption ? "Has caption" : "No caption"}</span>
                      </div>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      {carousel.slides.length} slide{carousel.slides.length === 1 ? "" : "s"}
                    </div>
                    <div className="flex items-center">
                      <Badge variant="secondary" className="text-[10px]">
                        <SlidersHorizontal className="mr-1 h-2.5 w-2.5" />
                        {carousel.aspectRatio}
                      </Badge>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      {carousel.postedAt
                        ? new Date(carousel.postedAt).toLocaleDateString()
                        : "-"}
                    </div>
                    <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                      {carousel.publishedPostUrl ? (
                        <a
                          href={carousel.publishedPostUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(event) => event.stopPropagation()}
                          className="inline-flex items-center gap-1 text-accent hover:underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span className="truncate">Open post</span>
                        </a>
                      ) : carousel.publishedPostId ? (
                        <span className="truncate font-mono text-xs">
                          {carousel.publishedPostId}
                        </span>
                      ) : (
                        <span>-</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-48 rounded-xl bg-muted animate-pulse"
                />
              ))}
            </div>
          ) : carousels.length === 0 ? (
            <div className="text-center py-20">
              <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">
                No carousels yet
              </h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                Create your first Instagram carousel. Our AI assistant will
                help you design beautiful slides in seconds.
              </p>
              <Button onClick={() => setShowCreateDialog(true)} variant="accent" size="lg">
                <Plus className="h-5 w-5" />
                Create Your First Carousel
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-border bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  {([
                    ["all", "Todos"],
                    ["draft", "Draft"],
                    ["scheduled", "Programados"],
                    ["posted", "Posted"],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => setCarouselStatusFilter(value)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        carouselStatusFilter === value
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="inline-flex rounded-full border border-border bg-background p-1">
                  <button
                    onClick={() => setCarouselViewMode("cards")}
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      carouselViewMode === "cards"
                        ? "bg-surface text-foreground shadow-sm"
                        : "text-muted-foreground"
                    }`}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    Tarjetas
                  </button>
                  <button
                    onClick={() => setCarouselViewMode("list")}
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      carouselViewMode === "list"
                        ? "bg-surface text-foreground shadow-sm"
                        : "text-muted-foreground"
                    }`}
                  >
                    <List className="h-3.5 w-3.5" />
                    Lista
                  </button>
                  {carouselStatusFilter === "scheduled" ? (
                    <button
                      onClick={() => setCarouselViewMode("calendar")}
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                        carouselViewMode === "calendar"
                          ? "bg-surface text-foreground shadow-sm"
                          : "text-muted-foreground"
                      }`}
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      Calendario
                    </button>
                  ) : null}
                </div>
              </div>

              {filteredCarousels.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-surface/60 px-6 py-12 text-center">
                  <Layers className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
                  <h2 className="mb-2 text-lg font-semibold">No hay carruseles en este estado</h2>
                  <p className="mx-auto max-w-md text-sm text-muted-foreground">
                    Probá con otro filtro o creá un nuevo carrusel para empezar.
                  </p>
                </div>
              ) : carouselViewMode === "calendar" && carouselStatusFilter === "scheduled" ? (
                <div className="rounded-2xl border border-border bg-surface">
                  <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        Vista mensual
                      </p>
                      <h2 className="text-lg font-semibold capitalize">
                        {formatCalendarMonth(calendarMonth)}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {visibleMonthScheduledCount} programado{visibleMonthScheduledCount === 1 ? "" : "s"} en este mes
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCalendarMonth(
                            (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1)
                          )
                        }
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCalendarMonth(getMonthStart(new Date()))}
                      >
                        Hoy
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCalendarMonth(
                            (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1)
                          )
                        }
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 border-b border-border bg-muted/30 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((label) => (
                      <div key={label} className="px-2 py-3">
                        {label}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-7">
                    {calendarDays.map((day) => {
                      const dayKey = formatCalendarDay(day);
                      const items = scheduledByDay[dayKey] ?? [];
                      const isCurrentMonth = day.getMonth() === calendarMonth.getMonth();
                      const isToday = dayKey === todayKey;

                      return (
                        <div
                          key={dayKey}
                          className={`min-h-36 border-b border-r border-border p-2 last:border-r-0 sm:[&:nth-child(7n)]:border-r-0 ${
                            isCurrentMonth ? "bg-surface" : "bg-muted/20"
                          }`}
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <span
                              className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium ${
                                isToday
                                  ? "bg-accent text-accent-foreground"
                                  : isCurrentMonth
                                    ? "text-foreground"
                                    : "text-muted-foreground"
                              }`}
                            >
                              {day.getDate()}
                            </span>
                            {items.length > 0 ? (
                              <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-700">
                                {items.length}
                              </span>
                            ) : null}
                          </div>

                          <div className="space-y-2">
                            {items.map((carousel) => (
                              <button
                                key={carousel.id}
                                onClick={() => router.push(`/carousel/${carousel.id}`)}
                                className="w-full rounded-lg border border-violet-200 bg-violet-500/5 px-2 py-2 text-left transition-colors hover:bg-violet-500/10"
                              >
                                <div className="truncate text-xs font-medium text-foreground">
                                  {carousel.name}
                                </div>
                                <div className="mt-1 flex items-center gap-1 text-[11px] text-violet-700">
                                  <CalendarClock className="h-3 w-3 shrink-0" />
                                  <span>{formatScheduledAt(carousel.scheduledAt!)}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : carouselViewMode === "cards" ? (
                <div className="oc-stagger grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredCarousels.map((carousel) => (
                    <div
                      key={carousel.id}
                      onClick={() => router.push(`/carousel/${carousel.id}`)}
                      className="relative text-left rounded-xl border border-border bg-surface hover:border-accent/50 hover:shadow-md hover:-translate-y-0.5 p-4 group cursor-pointer transition-[translate,border-color,box-shadow] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]"
                    >
                      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            await duplicateCarousel(carousel.id);
                          }}
                          className="h-7 w-7 rounded-lg flex items-center justify-center bg-white border border-border hover:bg-muted"
                          aria-label={`Duplicate ${carousel.name}`}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, carousel.id, carousel.name)}
                          className="h-7 w-7 rounded-lg flex items-center justify-center bg-white border border-border hover:bg-destructive hover:text-white hover:border-destructive"
                          aria-label={`Delete ${carousel.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="h-28 rounded-lg bg-muted mb-3 flex items-center justify-center overflow-hidden">
                        {carousel.slides.length > 0 ? (
                          <SlideRenderer
                            html={carousel.slides[0].html}
                            aspectRatio={carousel.aspectRatio}
                            className="w-full h-full"
                          />
                        ) : (
                          <Layers className="h-8 w-8 text-muted-foreground/30" />
                        )}
                      </div>
                      <h3 className="font-semibold text-sm group-hover:text-accent transition-colors truncate">
                        {carousel.name}
                      </h3>
                      {carousel.scheduledAt && !carousel.postedAt ? (
                        <div className="mt-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-700">
                            <CalendarClock className="h-3 w-3" />
                            {formatScheduledAt(carousel.scheduledAt)}
                          </span>
                        </div>
                      ) : carousel.postedAt ? (
                        <div className="mt-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" />
                            Posted {new Date(carousel.postedAt).toLocaleDateString()}
                          </span>
                          {carousel.publishedPostUrl ? (
                            <a
                              href={carousel.publishedPostUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(event) => event.stopPropagation()}
                              className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Ver post
                            </a>
                          ) : carousel.publishedPostId ? (
                            <div className="mt-2 truncate text-[11px] font-mono text-muted-foreground">
                              {carousel.publishedPostId}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="text-[10px]">
                          <SlidersHorizontal className="h-2.5 w-2.5 mr-1" />
                          {carousel.aspectRatio}
                        </Badge>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(carousel.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-border bg-surface">
                  <div className="grid grid-cols-[minmax(0,2.1fr)_110px_120px_180px_120px_minmax(0,1.2fr)] gap-4 border-b border-border px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    <span>Carousel</span>
                    <span>Slides</span>
                    <span>Format</span>
                    <span>Estado</span>
                    <span>Update</span>
                    <span>Detalle</span>
                  </div>
                  {filteredCarousels.map((carousel) => {
                    const status = getCarouselStatus(carousel);
                    return (
                      <div
                        key={carousel.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => router.push(`/carousel/${carousel.id}`)}
                        onKeyDown={(event) => handleRowKeyDown(event, carousel.id)}
                        className="grid w-full cursor-pointer grid-cols-[minmax(0,2.1fr)_110px_120px_180px_120px_minmax(0,1.2fr)] gap-4 border-b border-border/70 px-5 py-4 text-left transition-colors hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset last:border-b-0"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">{carousel.name}</div>
                          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {carousel.caption ? "Con caption" : "Sin caption"}
                            </span>
                            <span>{carousel.hashtags?.length ?? 0} hashtags</span>
                          </div>
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          {carousel.slides.length} slide{carousel.slides.length === 1 ? "" : "s"}
                        </div>
                        <div className="flex items-center">
                          <Badge variant="secondary" className="text-[10px]">
                            <SlidersHorizontal className="mr-1 h-2.5 w-2.5" />
                            {carousel.aspectRatio}
                          </Badge>
                        </div>
                        <div className="flex items-center">
                          {status === "scheduled" && carousel.scheduledAt ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-700">
                              <CalendarClock className="h-3 w-3" />
                              {formatScheduledAt(carousel.scheduledAt)}
                            </span>
                          ) : status === "posted" && carousel.postedAt ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                              <CheckCircle2 className="h-3 w-3" />
                              Posted {new Date(carousel.postedAt).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                              Draft
                            </span>
                          )}
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          {new Date(carousel.updatedAt).toLocaleDateString()}
                        </div>
                        <div className="flex min-w-0 items-center justify-between gap-2">
                          <div className="min-w-0 text-xs text-muted-foreground">
                            {carousel.publishedPostUrl ? (
                              <span className="truncate text-accent">Post publicado</span>
                            ) : status === "scheduled" ? (
                              <span className="truncate">Esperando publicacion</span>
                            ) : (
                              <span className="truncate">
                                {carousel.slides[0]?.notes || "Listo para seguir editando"}
                              </span>
                            )}
                          </div>
                          <div className="flex shrink-0 gap-1">
                            {carousel.publishedPostUrl ? (
                              <a
                                href={carousel.publishedPostUrl}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(event) => event.stopPropagation()}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border hover:bg-muted"
                                title="Ver post"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            ) : null}
                            <button
                              onClick={async (event) => {
                                event.stopPropagation();
                                await duplicateCarousel(carousel.id);
                              }}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border hover:bg-muted"
                              aria-label={`Duplicate ${carousel.name}`}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={(event) => handleDelete(event, carousel.id, carousel.name)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border hover:border-destructive hover:bg-destructive hover:text-white"
                              aria-label={`Delete ${carousel.name}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
