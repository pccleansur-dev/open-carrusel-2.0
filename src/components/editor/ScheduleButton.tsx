"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { CalendarClock, Check, ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Carousel } from "@/types/carousel";

interface ScheduleButtonProps {
  carouselId: string;
  slideCount: number;
  hasCaption: boolean;
  scheduledAt?: string | null;
  onScheduled?: () => Promise<void> | void;
}

type Status = "idle" | "saving" | "done" | "error";

const WEEK_DAYS = ["LU", "MA", "MI", "JU", "VI", "SA", "DO"];
const MONTH_NAMES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

function getMinimumScheduleDate(): Date {
  return new Date(Date.now() + 10 * 60 * 1000);
}

function roundToMinute(date: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    0,
    0
  );
}

function getInitialScheduleDate(): Date {
  return roundToMinute(getMinimumScheduleDate());
}

function formatDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function buildCalendarDays(month: Date): Date[] {
  const start = getMonthStart(month);
  const offset = (start.getDay() + 6) % 7;
  const firstGridDay = new Date(start);
  firstGridDay.setDate(start.getDate() - offset);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(firstGridDay);
    day.setDate(firstGridDay.getDate() + index);
    return day;
  });
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function combineDateAndTime(baseDate: Date, hours: number, minutes: number): Date {
  return new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
    hours,
    minutes,
    0,
    0
  );
}

function getTimeOptions(step: number) {
  return Array.from({ length: 60 / step }, (_, index) => index * step);
}

export function ScheduleButton({
  carouselId,
  slideCount,
  hasCaption,
  scheduledAt,
  onScheduled,
}: ScheduleButtonProps) {
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(() => getInitialScheduleDate());
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => getMonthStart(getInitialScheduleDate()));
  const [scheduledCountsByDay, setScheduledCountsByDay] = useState<Record<string, number>>({});
  const [optimisticScheduledAt, setOptimisticScheduledAt] = useState<string | null>(scheduledAt ?? null);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    setOptimisticScheduledAt(scheduledAt ?? null);
  }, [scheduledAt]);

  const minScheduleDate = useMemo(() => getMinimumScheduleDate(), [open]);
  const selectedHour = selectedDate.getHours();
  const selectedMinute = selectedDate.getMinutes();
  const calendarDays = useMemo(() => buildCalendarDays(calendarMonth), [calendarMonth]);
  const minuteOptions = useMemo(() => getTimeOptions(5), []);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const loadScheduledDays = async () => {
      try {
        const response = await fetch("/api/carousels");
        if (!response.ok) return;
        const data = (await response.json()) as { carousels?: Carousel[] };
        if (cancelled) return;

        const counts = (data.carousels ?? [])
          .filter((carousel) => carousel.id !== carouselId && carousel.scheduledAt && !carousel.postedAt)
          .reduce<Record<string, number>>((acc, carousel) => {
            const key = formatDayKey(new Date(carousel.scheduledAt!));
            acc[key] = (acc[key] ?? 0) + 1;
            return acc;
          }, {});

        setScheduledCountsByDay(counts);
      } catch {
        // ignore
      }
    };

    void loadScheduledDays();
    return () => {
      cancelled = true;
    };
  }, [open, carouselId]);

  const handleOpenDialog = () => {
    const initialDate = scheduledAt ? roundToMinute(new Date(scheduledAt)) : getInitialScheduleDate();
    setSelectedDate(initialDate);
    setCalendarMonth(getMonthStart(initialDate));
    setOpen(true);
  };

  const save = async (scheduledAtIso: string | null) => {
    setStatus("saving");
    setErrorMsg("");

    try {
      const response = await fetch(`/api/carousels/${carouselId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt: scheduledAtIso }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Error al programar");
      }

      const data = (await response.json().catch(() => ({}))) as { scheduledAt?: string | null };
      setOptimisticScheduledAt(data.scheduledAt ?? scheduledAtIso ?? null);
      setStatus("done");
      setOpen(false);
      void Promise.resolve(onScheduled?.()).catch(() => {
        // ignore refresh errors; optimistic state already reflects the successful save
      });
      setTimeout(() => setStatus("idle"), 3000);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Error desconocido");
      setStatus("error");
      setTimeout(() => setStatus("idle"), 5000);
    }
  };

  const handleConfirm = () => {
    if (selectedDate < minScheduleDate) {
      setErrorMsg("La fecha debe ser al menos 10 minutos en el futuro");
      setStatus("error");
      setTimeout(() => setStatus("idle"), 4000);
      return;
    }
    void save(selectedDate.toISOString());
  };

  const handleCancel = async (event: MouseEvent) => {
    event.stopPropagation();
    await save(null);
  };

  const handleSelectDay = (day: Date) => {
    const updated = combineDateAndTime(day, selectedHour, selectedMinute);
    setSelectedDate(updated);
  };

  const handleHourChange = (hours: number) => {
    setSelectedDate((current) => combineDateAndTime(current, hours, current.getMinutes()));
  };

  const handleMinuteChange = (minutes: number) => {
    setSelectedDate((current) => combineDateAndTime(current, current.getHours(), minutes));
  };

  if (optimisticScheduledAt) {
    const label = new Date(optimisticScheduledAt).toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    return (
      <div className="relative flex items-center gap-1">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/40 bg-violet-500/10 px-3 py-1 text-[11px] font-medium text-violet-700">
          <CalendarClock className="h-3.5 w-3.5" />
          <span>{label}</span>
        </div>
        <button
          onClick={handleCancel}
          disabled={status === "saving"}
          title="Cancelar programacion"
          className="rounded-full p-0.5 text-muted-foreground transition-colors hover:text-destructive"
        >
          {status === "saving" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <X className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Button
        onClick={handleOpenDialog}
        disabled={slideCount === 0 || status === "saving"}
        variant="outline"
        size="sm"
        title={
          slideCount === 0
            ? "No hay slides para programar"
            : !hasCaption
              ? "Se generara un caption automatico al programar"
              : "Programar publicacion en Instagram"
        }
        className="border-violet-500/40 text-violet-600 hover:border-violet-500 hover:bg-violet-500/10 disabled:opacity-40"
      >
        <span key={status} className="oc-enter-pop inline-flex items-center gap-2">
          {status === "saving" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Guardando...</span>
            </>
          ) : status === "done" ? (
            <>
              <Check className="h-4 w-4" />
              <span>Programado</span>
            </>
          ) : (
            <>
              <CalendarClock className="h-4 w-4" />
              <span>Programar</span>
            </>
          )}
        </span>
      </Button>

      {status === "error" && errorMsg ? (
        <div className="absolute right-0 top-full z-50 mt-1 w-64 rounded-md bg-destructive px-3 py-2 text-xs text-destructive-foreground shadow-lg">
          {errorMsg}
        </div>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-2xl rounded-xl border border-border bg-surface p-6 shadow-xl">
            <h2 className="mb-1 text-base font-semibold">Programar publicacion</h2>
            <p className="mb-4 text-xs text-muted-foreground">
              El carrusel se publicara automaticamente en Instagram a la hora elegida.
            </p>

            <div className="mb-4 rounded-lg border border-violet-200 bg-violet-500/[0.06] px-3 py-2 text-sm text-violet-900">
              {selectedDate.toLocaleString("es-AR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>

            <div className="grid gap-4 md:grid-cols-[1.4fr_0.8fr]">
              <div className="rounded-lg border border-border p-3">
                <div className="mb-3 flex items-center justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setCalendarMonth(
                        (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1)
                      )
                    }
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="text-sm font-semibold capitalize">
                    {MONTH_NAMES[calendarMonth.getMonth()]} de {calendarMonth.getFullYear()}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
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

                <div className="mb-2 grid grid-cols-7 gap-1">
                  {WEEK_DAYS.map((label) => (
                    <div
                      key={label}
                      className="py-1 text-center text-[11px] font-semibold uppercase text-muted-foreground"
                    >
                      {label}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day) => {
                    const dayKey = formatDayKey(day);
                    const scheduledCount = scheduledCountsByDay[dayKey] ?? 0;
                    const hasScheduled = scheduledCount > 0;
                    const isSelected = isSameDay(day, selectedDate);
                    const isCurrentMonth = day.getMonth() === calendarMonth.getMonth();
                    const isPastUnavailable =
                      combineDateAndTime(day, selectedHour, selectedMinute) < minScheduleDate &&
                      !isSameDay(day, minScheduleDate);

                    return (
                      <button
                        key={dayKey}
                        type="button"
                        onClick={() => handleSelectDay(day)}
                        className={`relative rounded-lg px-2 py-2 text-sm transition-colors ${
                          isSelected
                            ? "bg-accent text-accent-foreground"
                            : hasScheduled
                              ? "bg-violet-500/[0.12] text-violet-900 ring-1 ring-violet-300"
                              : "hover:bg-muted"
                        } ${!isCurrentMonth ? "text-muted-foreground/60" : ""} ${
                          isPastUnavailable ? "opacity-60" : ""
                        }`}
                      >
                        <span>{day.getDate()}</span>
                        {hasScheduled ? (
                          <span
                            className={`absolute right-1 top-1 inline-flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold ${
                              isSelected
                                ? "bg-white/20 text-white"
                                : "bg-violet-600 text-white"
                            }`}
                          >
                            {scheduledCount}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="inline-flex h-3 w-3 rounded-full bg-violet-600" />
                  Dias con posteos ya programados
                </div>
              </div>

              <div className="rounded-lg border border-border p-3">
                <div className="mb-3 text-sm font-semibold">Hora</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                      Hora
                    </label>
                    <select
                      value={selectedHour}
                      onChange={(event) => handleHourChange(Number(event.target.value))}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                      {Array.from({ length: 24 }, (_, hour) => (
                        <option key={hour} value={hour}>
                          {String(hour).padStart(2, "0")}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                      Min
                    </label>
                    <select
                      value={selectedMinute}
                      onChange={(event) => handleMinuteChange(Number(event.target.value))}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                      {minuteOptions.map((minute) => (
                        <option key={minute} value={minute}>
                          {String(minute).padStart(2, "0")}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Los dias en violeta ya tienen uno o mas posteos programados.
                </p>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleConfirm}
                disabled={status === "saving"}
                className="bg-violet-600 text-white hover:bg-violet-700"
              >
                {status === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Programar"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
