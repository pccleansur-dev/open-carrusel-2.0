"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  FileSpreadsheet,
  Loader2,
  Maximize2,
  Minimize2,
  Plus,
  RefreshCw,
  TableProperties,
  X,
} from "lucide-react";
import { SlideRenderer } from "@/components/editor/SlideRenderer";
import { Button } from "@/components/ui/button";
import { fetchJson, ApiError } from "@/lib/api/client";
import { fmtDate, fmtDateTime } from "@/lib/utils";
import type { PlanningSnapshot } from "@/lib/google-sheets-planning";
import { createCarousel, listCarousels } from "@/lib/api/carousels";
import type { Carousel, PlanningContext } from "@/types/carousel";
import type { Template } from "@/types/template";

interface PlanningTabProps {
  onIntegrationsOpen: () => void;
}

type PlanningRowFilter = "active" | "all" | "new" | "existing" | "archived";
type PlanningSortField = "planningDate" | "status";
type SortOrder = "asc" | "desc";

function parseHashtags(value: string) {
  return value
    .split(/[,\s]+/)
    .map((tag) => tag.replace(/^#/, "").trim())
    .filter(Boolean);
}

function shouldExpandCell(value: string) {
  return value.trim().length > 72 || value.includes("\n");
}

function normalizeMatchValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ");
}

function getColumnCellWidth(column: string, isExpanded = false) {
  const normalized = column.trim().toLowerCase();
  if (normalized.includes("tema del carrusel") || normalized === "post" || normalized === "titulo") {
    return isExpanded
      ? "w-[520px] min-w-[520px] max-w-[520px]"
      : "w-[320px] min-w-[320px] max-w-[320px]";
  }
  if (normalized.includes("desarrollo") || normalized.includes("prompt")) {
    return isExpanded
      ? "w-[460px] min-w-[460px] max-w-[460px]"
      : "w-[240px] min-w-[240px] max-w-[240px]";
  }
  if (normalized.includes("fecha") || normalized.includes("dia") || normalized.includes("día")) {
    return "w-[110px] min-w-[110px] max-w-[110px]";
  }
  if (normalized.includes("estado")) {
    return "w-[100px] min-w-[100px] max-w-[100px]";
  }
  return isExpanded
    ? "w-[220px] min-w-[220px] max-w-[220px]"
    : "w-[140px] min-w-[140px] max-w-[140px]";
}

function getStatusColumnWidth() {
  return "w-[124px] min-w-[124px] max-w-[124px]";
}

function parsePlanningDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return 0;

  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const [, day, month, rawYear] = slashMatch;
    const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
    return new Date(Number(year), Number(month) - 1, Number(day)).getTime();
  }

  const parsed = new Date(trimmed).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function isPlanningDateColumn(column: string) {
  const normalized = column
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return normalized === "fecha" || normalized.includes("fecha");
}

function getStatusSortRank(carousel: Carousel | null) {
  if (carousel?.scheduledAt && !carousel.postedAt) return 0;
  if (carousel?.postedAt) return 1;
  return 2;
}

function getCompletionRate(done: number, total: number) {
  if (total === 0) return 0;
  return Math.round((done / total) * 100);
}

function buildPlanningGenerationPrompt(
  row: PlanningSnapshot["rows"][number],
  templateName: string
) {
  return [
    `Trabajemos este carrusel a partir del template "${templateName}".`,
    "Mantené la estética, jerarquía visual, ritmo, colores, composición y lenguaje gráfico del template.",
    "No inventes una estética nueva: adaptá el contenido al sistema visual ya existente.",
    "Tomá 'Desarrollo de slides' como el brief principal para construir la narrativa slide por slide.",
    "IMPORTANTE: este carrusel ya fue creado copiando los slides del template.",
    "Tu tarea no está terminada hasta que los slides existentes cambien visiblemente y contengan el contenido del planning.",
    "No empieces desde cero y no agregues slides nuevos si ya hay slides suficientes.",
    "Primero hacé GET del carrusel para leer el HTML completo y los IDs de slides existentes.",
    "Después actualizá esos slides existentes con PUT /api/carousels/{id}/slides/{slideId}, manteniendo su HTML/CSS, estructura, espaciados, tipografías, colores y ritmo visual.",
    "Cambiá solo los textos/contenido necesarios para adaptar el planning.",
    row.title ? `Tema del carrusel: ${row.title}` : "",
    row.status ? `Estado editorial en planning: ${row.status}` : "",
    row.scheduledFor ? `Fecha editorial: ${row.scheduledFor}` : "",
    row.network ? `Red / canal: ${row.network}` : "",
    row.copy ? `Contexto editorial adicional: ${row.copy}` : "",
    row.hashtags ? `Hashtags de referencia: ${row.hashtags}` : "",
    row.promptSlides ? `Desarrollo de slides: ${row.promptSlides}` : "",
    "Objetivo de ejecución: transformar los slides existentes del template en este nuevo carrusel, no crear una estética nueva.",
    "Antes de responder, verificá con GET que los slides tienen el nuevo contenido. En la respuesta final indicá qué números de slide actualizaste.",
    "No generes caption ni hashtags todavía en esta primera pasada. Primero dejá los slides adaptados y luego ofrecé generar caption/hashtags.",
    "No reutilices un caption preestablecido. Usá el planning solo como brief editorial.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function PlanningTab({ onIntegrationsOpen }: PlanningTabProps) {
  const router = useRouter();
  const [planning, setPlanning] = useState<PlanningSnapshot | null>(null);
  const [carousels, setCarousels] = useState<Carousel[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [creatingRowId, setCreatingRowId] = useState<string | null>(null);
  const [matchFilter, setMatchFilter] = useState<PlanningRowFilter>("active");
  const [sortField, setSortField] = useState<PlanningSortField>("planningDate");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [isTableExpanded, setIsTableExpanded] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatePickerRow, setTemplatePickerRow] = useState<PlanningSnapshot["rows"][number] | null>(null);
  const [expandedCell, setExpandedCell] = useState<{
    column: string;
    value: string;
    rowLabel: string;
  } | null>(null);

  const loadPlanning = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [planningData, carouselsData] = await Promise.all([
        fetchJson<PlanningSnapshot>("/api/planning"),
        listCarousels(),
      ]);
      setCarousels(carouselsData.carousels ?? []);
      setPlanning(planningData);
    } catch (err) {
      setPlanning(null);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("No se pudo cargar el planning.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlanning();
  }, [loadPlanning]);

  useEffect(() => {
    if (!isTableExpanded) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsTableExpanded(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isTableExpanded]);

  const loadTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const data = await fetchJson<{ templates: Template[] }>("/api/templates");
      setTemplates(data.templates ?? []);
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  const handleCreateFromRow = useCallback(async (row: PlanningSnapshot["rows"][number]) => {
    setTemplatePickerRow(row);
    if (templates.length === 0) {
      try {
        await loadTemplates();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "No se pudieron cargar los templates.");
      }
    }
  }, [loadTemplates, templates.length]);

  const handleCreateFromTemplate = useCallback(
    async (template: Template) => {
      const row = templatePickerRow;
      if (!planning || !row) return;
      setCreatingRowId(row.id);
      setError("");
      try {
        const planningContext: PlanningContext = {
          rowId: row.id,
          title: row.title || `Planning ${row.rowIndex}`,
          status: row.status || undefined,
          scheduledFor: row.scheduledFor || undefined,
          promptSlides: row.promptSlides || undefined,
          copy: row.copy || undefined,
          hashtags: parseHashtags(row.hashtags),
          network: row.network || undefined,
          image: row.image || undefined,
          fileId: row.fileId || undefined,
          driveId: row.driveId || undefined,
          sourceLabel: planning.sourceLabel,
          sourceUrl: planning.sourceUrl,
        };
        const response = await fetch(`/api/templates/${template.id}/use`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: row.title || template.name,
            hashtags: planningContext.hashtags,
            planning: planningContext,
            tags: ["planning", row.network.trim().toLowerCase(), row.status.trim().toLowerCase()].filter(Boolean),
          }),
        });
        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error || "No se pudo crear el carrusel desde el template.");
        }
        const carousel = (await response.json()) as Carousel;
        localStorage.setItem(
          `planning-autostart-${carousel.id}`,
          JSON.stringify({ prompt: buildPlanningGenerationPrompt(row, template.name), templateName: template.name })
        );
        setTemplatePickerRow(null);
        router.push(`/carousel/${carousel.id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo crear el carrusel desde el template.");
      } finally {
        setCreatingRowId(null);
      }
    },
    [planning, router, templatePickerRow]
  );

  const handleLegacyCreate = useCallback(
    async (row: PlanningSnapshot["rows"][number]) => {
      if (!planning) return;
      setCreatingRowId(row.id);
      setError("");
      try {
        const planningContext: PlanningContext = {
          rowId: row.id,
          title: row.title || `Planning ${row.rowIndex}`,
          status: row.status || undefined,
          scheduledFor: row.scheduledFor || undefined,
          promptSlides: row.promptSlides || undefined,
          copy: row.copy || undefined,
          hashtags: parseHashtags(row.hashtags),
          network: row.network || undefined,
          image: row.image || undefined,
          fileId: row.fileId || undefined,
          driveId: row.driveId || undefined,
          sourceLabel: planning.sourceLabel,
          sourceUrl: planning.sourceUrl,
        };
        const carousel = await createCarousel(row.title || `Planning ${row.rowIndex}`, "4:5", {
          hashtags: planningContext.hashtags,
          tags: ["planning", row.network.trim().toLowerCase(), row.status.trim().toLowerCase()].filter(Boolean),
          planning: planningContext,
        });
        router.push(`/carousel/${carousel.id}`);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "No se pudo crear el carrusel desde la fila.");
      } finally {
        setCreatingRowId(null);
      }
    },
    [planning, router]
  );

  const getMatchingCarousel = useCallback(
    (row: PlanningSnapshot["rows"][number]) => {
      const normalizedTitle = normalizeMatchValue(row.title || "");
      if (!normalizedTitle) return null;
      return (
        carousels.find((c) => c.planning?.rowId === row.id) ||
        carousels.find((c) => normalizeMatchValue(c.planning?.title || "") === normalizedTitle) ||
        carousels.find((c) => normalizeMatchValue(c.name) === normalizedTitle) ||
        null
      );
    },
    [carousels]
  );

  const getCarouselStateLabel = useCallback((carousel: Carousel) => {
    if (carousel.postedAt) {
      return {
        label: "Posteado",
        tone: "bg-emerald-500/10 text-emerald-700",
        date: fmtDate(carousel.postedAt),
      };
    }
    if (carousel.scheduledAt) {
      return {
        label: "Programado",
        tone: "bg-violet-500/10 text-violet-700",
        date: fmtDateTime(carousel.scheduledAt),
      };
    }
    return { label: "Draft", tone: "bg-muted text-muted-foreground", date: "" };
  }, []);

  const planningRows = planning?.rows ?? [];
  const rowMatches = planningRows.map((row) => ({
    row,
    carousel: getMatchingCarousel(row),
  }));
  const matchedRows = rowMatches.filter(({ carousel }) => !!carousel);
  const archivedRows = rowMatches.filter(({ carousel }) => !!carousel?.postedAt);
  const activeRows = rowMatches.filter(({ carousel }) => !carousel?.postedAt);
  const scheduledRows = rowMatches.filter(({ carousel }) => !!carousel?.scheduledAt && !carousel?.postedAt);
  const rowsWithPlanningDate = planningRows.filter((row) => !!row.scheduledFor);
  const nextScheduledCarousel = scheduledRows
    .map(({ carousel }) => carousel)
    .filter((carousel): carousel is Carousel => !!carousel?.scheduledAt)
    .sort((a, b) => new Date(a.scheduledAt ?? 0).getTime() - new Date(b.scheduledAt ?? 0).getTime())[0];
  const captionsReady = carousels.filter((carousel) => !!carousel.caption?.trim()).length;
  const hashtagReady = carousels.filter((carousel) => (carousel.hashtags?.length ?? 0) > 0).length;
  const visibleRows = rowMatches
    .filter(({ carousel }) => {
      const hasMatch = !!carousel;
      const isArchived = !!carousel?.postedAt;
      if (matchFilter === "active") return !isArchived;
      if (matchFilter === "new") return !hasMatch;
      if (matchFilter === "existing") return hasMatch && !isArchived;
      if (matchFilter === "archived") return isArchived;
      return true;
    })
    .sort((a, b) => {
      if (sortField === "status") {
        const statusA = getStatusSortRank(a.carousel);
        const statusB = getStatusSortRank(b.carousel);
        if (statusA !== statusB) {
          return sortOrder === "asc" ? statusA - statusB : statusB - statusA;
        }

        const statusDateA = new Date(a.carousel?.scheduledAt ?? a.carousel?.postedAt ?? 0).getTime();
        const statusDateB = new Date(b.carousel?.scheduledAt ?? b.carousel?.postedAt ?? 0).getTime();
        if (statusDateA !== statusDateB) {
          return sortOrder === "asc" ? statusDateA - statusDateB : statusDateB - statusDateA;
        }
      }

      const dateA = parsePlanningDate(a.row.scheduledFor) || Number.MAX_SAFE_INTEGER;
      const dateB = parsePlanningDate(b.row.scheduledFor) || Number.MAX_SAFE_INTEGER;
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    })
    .map(({ row }) => row);
  const completionRate = getCompletionRate(archivedRows.length, planningRows.length);

  const handleSort = useCallback((field: PlanningSortField) => {
    setSortField((current) => {
      if (current === field) {
        setSortOrder((order) => (order === "asc" ? "desc" : "asc"));
        return current;
      }
      setSortOrder("asc");
      return field;
    });
  }, []);

  return (
    <>
      {/* Expanded cell modal */}
      {expandedCell ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-2xl border border-border bg-surface shadow-2xl">
            <div className="flex items-start justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold">{expandedCell.column}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{expandedCell.rowLabel}</p>
              </div>
              <button
                onClick={() => setExpandedCell(null)}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
              <pre className="whitespace-pre-wrap break-words font-sans text-sm text-foreground">
                {expandedCell.value}
              </pre>
            </div>
          </div>
        </div>
      ) : null}

      {/* Template picker modal */}
      {templatePickerRow ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6 backdrop-blur-sm">
          <div className="w-full max-w-5xl rounded-2xl border border-border bg-surface shadow-2xl">
            <div className="flex items-start justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-base font-semibold">Elegir template base</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {templatePickerRow.title || `Fila ${templatePickerRow.rowIndex}`} va a crearse manteniendo la estética del template elegido.
                </p>
              </div>
              <button
                onClick={() => setTemplatePickerRow(null)}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-y-auto p-5">
              {templatesLoading ? (
                <div className="py-12 text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="mt-3 text-sm text-muted-foreground">Cargando templates...</p>
                </div>
              ) : templates.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
                  <p className="text-sm font-medium">No hay templates guardados</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Guardá al menos un template para poder lanzar carruseles del planning con una estética base consistente.
                  </p>
                  <div className="mt-4 flex justify-center gap-2">
                    <Button variant="outline" onClick={() => setTemplatePickerRow(null)}>Cerrar</Button>
                    <Button onClick={() => void handleLegacyCreate(templatePickerRow)} disabled={creatingRowId !== null}>
                      Crear sin template
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => void handleCreateFromTemplate(template)}
                      disabled={creatingRowId !== null}
                      className="rounded-2xl border border-border bg-background p-4 text-left transition-colors hover:border-accent/50 hover:bg-muted/20"
                    >
                      <div className="mb-3 h-32 overflow-hidden rounded-xl border border-border bg-muted">
                        {template.slides[0] ? (
                          <SlideRenderer html={template.slides[0].html} aspectRatio={template.aspectRatio} className="h-full w-full" />
                        ) : null}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-semibold">{template.name}</h3>
                          <p className="mt-1 text-xs text-muted-foreground">{template.slides.length} slides · {template.aspectRatio}</p>
                        </div>
                        <span className="rounded-full bg-accent/10 px-2 py-1 text-[10px] font-medium text-accent">Usar base</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Main content */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-[11px] font-medium text-accent">
              <TableProperties className="h-3.5 w-3.5" />
              Google Sheets live view
            </div>
            <h1 className="mt-3 text-2xl font-bold">Planning editorial</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Esta vista lee la hoja remota en vivo para que el plan siga viviendo en Sheets y Open Carrusel funcione como capa de ejecucion.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {planning?.sourceUrl ? (
              <Button variant="outline" asChild>
                <Link href={planning.sourceUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Abrir Sheets
                </Link>
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => void loadPlanning()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refrescar
            </Button>
          </div>
        </div>

        {planning ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-border bg-surface p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Planning activo</p>
                <p className="mt-2 text-2xl font-semibold">{activeRows.length}</p>
                <p className="mt-1 text-xs text-muted-foreground">{planningRows.length} items totales en Sheets</p>
              </div>
              <div className="rounded-2xl border border-border bg-surface p-4">
                <p className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  <Archive className="h-3.5 w-3.5" />
                  Archivados
                </p>
                <p className="mt-2 text-2xl font-semibold">{archivedRows.length}</p>
                <p className="mt-1 text-xs text-muted-foreground">{completionRate}% del planning ya posteado</p>
              </div>
              <div className="rounded-2xl border border-border bg-surface p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Programados</p>
                <p className="mt-2 text-2xl font-semibold">{scheduledRows.length}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {nextScheduledCarousel?.scheduledAt ? `Proximo ${fmtDateTime(nextScheduledCarousel.scheduledAt)}` : "Sin proximos posts"}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-surface p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Contenido listo</p>
                <p className="mt-2 text-2xl font-semibold">{captionsReady}</p>
                <p className="mt-1 text-xs text-muted-foreground">{hashtagReady} con hashtags cargados</p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              <div className="rounded-2xl border border-border bg-surface p-5">
                <div className="mb-4 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-accent" />
                  <h2 className="text-sm font-semibold">Dashboard de cuenta</h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Carruseles</p>
                    <p className="mt-1 text-xl font-semibold">{carousels.length}</p>
                    <p className="text-xs text-muted-foreground">{matchedRows.length} conectados al planning</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Fechas planning</p>
                    <p className="mt-1 text-xl font-semibold">{rowsWithPlanningDate.length}</p>
                    <p className="text-xs text-muted-foreground">Filas con fecha editorial</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Interacciones</p>
                    <p className="mt-1 text-xl font-semibold">--</p>
                    <p className="text-xs text-muted-foreground">Pendiente de analytics</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-surface p-5">
                <div className="mb-4 flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-accent" />
                  <h2 className="text-sm font-semibold">Ritmo editorial</h2>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Nuevos por crear</span>
                    <span className="font-semibold">{planningRows.length - matchedRows.length}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Borradores activos</span>
                    <span className="font-semibold">{activeRows.length - scheduledRows.length - (planningRows.length - matchedRows.length)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Fuente</span>
                    <span className="truncate text-right font-semibold">{planning.sourceLabel}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-4 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-surface p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Filas</p>
                <p className="mt-2 text-2xl font-semibold">{planningRows.length}</p>
                <p className="mt-1 text-xs text-muted-foreground">Items sincronizados desde Sheets</p>
              </div>
              <div className="rounded-2xl border border-border bg-surface p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Ya creados</p>
                <p className="mt-2 text-2xl font-semibold">{matchedRows.length}</p>
                <p className="mt-1 text-xs text-muted-foreground">Coinciden con carruseles existentes</p>
              </div>
              <div className="rounded-2xl border border-border bg-surface p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Con fecha</p>
                <p className="mt-2 text-2xl font-semibold">{planningRows.filter((r) => r.scheduledFor).length}</p>
                <p className="mt-1 text-xs text-muted-foreground">Listos para calendarizar</p>
              </div>
              <div className="rounded-2xl border border-border bg-surface p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Fuente</p>
                <p className="mt-2 truncate text-sm font-semibold">{planning.sourceLabel}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  Actualizado{" "}
                  {new Date(planning.fetchedAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>

            <div
              className={
                isTableExpanded
                  ? "fixed inset-3 z-40 flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl sm:inset-5"
                  : "overflow-hidden rounded-2xl border border-border bg-surface"
              }
            >
              <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold">Vista de planilla</h2>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsTableExpanded((current) => !current)}
                      className="h-7 px-2 text-[11px]"
                    >
                      {isTableExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                      {isTableExpanded ? "Contraer" : "Pantalla completa"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isTableExpanded
                      ? "Vista amplia para revisar el planning con mas datos visibles."
                      : "Tabla compacta para ver el planning completo sin perder columnas."}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>{planning.columns.length} columnas detectadas</span>
                  </div>
                  <div className="inline-flex rounded-full border border-border bg-background p-1">
                    {([
                      ["active", "Activos"],
                      ["new", "Nuevos"],
                      ["existing", "Ya creados"],
                      ["archived", "Archivados"],
                      ["all", "Todos"],
                    ] as const).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setMatchFilter(value)}
                        className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                          matchFilter === value ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {planning.columns.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <TableProperties className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
                  <h3 className="text-base font-semibold">La hoja no tiene datos todavia</h3>
                  <p className="mt-2 text-sm text-muted-foreground">Apenas agregues encabezados y filas en Google Sheets, van a aparecer aca.</p>
                </div>
              ) : (
                <div className={isTableExpanded ? "flex-1 overflow-auto" : "overflow-x-auto"}>
                  <table className="min-w-max border-separate border-spacing-0">
                    <thead>
                      <tr className="bg-muted/30">
                        <th className="sticky left-0 z-10 w-[92px] min-w-[92px] border-b border-border bg-muted/30 px-2 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          Accion
                        </th>
                        <th className={`${getStatusColumnWidth()} border-b border-border bg-muted/30 px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground`}>
                          <button
                            type="button"
                            onClick={() => handleSort("status")}
                            className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
                            title="Ordenar por estado"
                          >
                            Estado
                            {sortField === "status" ? (
                              sortOrder === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                            ) : null}
                          </button>
                        </th>
                        {planning.columns.map((column) => (
                          <th key={column} className="border-b border-border px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                            {isPlanningDateColumn(column) ? (
                              <button
                                type="button"
                                onClick={() => handleSort("planningDate")}
                                className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
                                title="Ordenar por fecha en planning"
                              >
                                {column}
                                {sortField === "planningDate" ? (
                                  sortOrder === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                                ) : null}
                              </button>
                            ) : (
                              column
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRows.map((row) => {
                        const existingCarousel = getMatchingCarousel(row);
                        const existingState = existingCarousel ? getCarouselStateLabel(existingCarousel) : null;
                        return (
                          <tr key={row.id} className="odd:bg-surface even:bg-muted/[0.08]">
                            <td className="sticky left-0 z-10 w-[92px] min-w-[92px] border-b border-border/70 bg-inherit px-2 py-2.5 align-top">
                              <div className="space-y-1.5">
                                {existingCarousel ? (
                                  <Button size="sm" variant="outline" onClick={() => router.push(`/carousel/${existingCarousel.id}`)} className="h-8 w-full px-2 text-[11px]">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Abrir
                                  </Button>
                                ) : (
                                  <Button size="sm" variant="outline" onClick={() => void handleCreateFromRow(row)} disabled={creatingRowId !== null} className="h-8 w-full px-2 text-[11px]">
                                    {creatingRowId === row.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                                    Crear
                                  </Button>
                                )}
                              </div>
                            </td>
                            <td className={`${getStatusColumnWidth()} border-b border-border/70 px-2.5 py-2.5 align-top text-xs text-foreground`}>
                              {existingCarousel ? (
                                <div className="space-y-1">
                                  <span className={`inline-flex w-full items-center justify-center rounded-full px-2 py-1 text-[10px] font-medium ${existingState?.tone}`}>
                                    {existingState?.label}
                                  </span>
                                  {existingState?.date ? (
                                    <span className="block text-center text-[10px] leading-4 text-muted-foreground">{existingState.date}</span>
                                  ) : null}
                                </div>
                              ) : (
                                <span className="inline-flex w-full items-center justify-center rounded-full bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground">
                                  Borrador
                                </span>
                              )}
                            </td>
                            {planning.columns.map((column) => (
                              <td key={`${row.id}-${column}`} className={`${getColumnCellWidth(column, isTableExpanded)} border-b border-border/70 px-2.5 py-2.5 align-top text-xs text-foreground`}>
                                {row.raw[column] ? (
                                  <div className="space-y-1">
                                    <div
                                      className={`overflow-hidden leading-5 ${
                                        isTableExpanded
                                          ? "max-h-16 whitespace-normal break-words"
                                          : "text-ellipsis whitespace-nowrap"
                                      }`}
                                      title={row.raw[column]}
                                    >
                                      {row.raw[column]}
                                    </div>
                                    {shouldExpandCell(row.raw[column]) ? (
                                      <button
                                        type="button"
                                        onClick={() => setExpandedCell({ column, value: row.raw[column], rowLabel: row.title || `Fila ${row.rowIndex}` })}
                                        className="text-[10px] font-medium text-accent hover:underline"
                                      >
                                        Ver
                                      </button>
                                    ) : null}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : loading ? (
          <div className="rounded-2xl border border-border bg-surface p-12 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">Cargando planning desde Google Sheets...</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-surface/60 px-6 py-12 text-center">
            <TableProperties className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
            <h2 className="text-lg font-semibold">Google Sheets todavia no esta conectado</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
              Configura la URL de tu planning en Google Sheets para poder leerlo desde Open Carrusel.
            </p>
            {error ? <p className="mx-auto mt-3 max-w-xl text-sm text-destructive">{error}</p> : null}
            <div className="mt-6 flex justify-center gap-2">
              <Button onClick={onIntegrationsOpen}>Configurar Sheets</Button>
              <Button variant="outline" asChild>
                <Link href="https://support.google.com/docs/answer/183965" target="_blank" rel="noreferrer">
                  Como publicar CSV
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
