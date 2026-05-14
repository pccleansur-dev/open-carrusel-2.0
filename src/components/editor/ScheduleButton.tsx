"use client";

import { useState } from "react";
import { CalendarClock, X, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScheduleButtonProps {
  carouselId: string;
  slideCount: number;
  hasCaption: boolean;
  scheduledAt?: string | null;
  onScheduled?: () => Promise<void> | void;
}

type Status = "idle" | "saving" | "done" | "error";

function toLocalDatetimeValue(isoString: string): string {
  const d = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function minDatetimeValue(): string {
  const d = new Date(Date.now() + 10 * 60 * 1000); // now + 10 min
  return toLocalDatetimeValue(d.toISOString());
}

export function ScheduleButton({
  carouselId,
  slideCount,
  hasCaption,
  scheduledAt,
  onScheduled,
}: ScheduleButtonProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const canSchedule = slideCount > 0;

  const handleOpenDialog = () => {
    setValue(minDatetimeValue());
    setOpen(true);
  };

  const save = async (scheduledAtIso: string | null) => {
    setStatus("saving");
    setErrorMsg("");
    try {
      const res = await fetch(`/api/carousels/${carouselId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt: scheduledAtIso }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Error al programar");
      }
      await onScheduled?.();
      setStatus("done");
      setOpen(false);
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error desconocido");
      setStatus("error");
      setTimeout(() => setStatus("idle"), 5000);
    }
  };

  const handleConfirm = () => {
    if (!value) return;
    save(new Date(value).toISOString());
  };

  const handleCancel = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await save(null);
  };

  if (scheduledAt) {
    const label = new Date(scheduledAt).toLocaleString("es-AR", {
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
          title="Cancelar programación"
          className="rounded-full p-0.5 text-muted-foreground hover:text-destructive transition-colors"
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
        disabled={!canSchedule || status === "saving"}
        variant="outline"
        size="sm"
        title={
          slideCount === 0
            ? "No hay slides para programar"
            : !hasCaption
              ? "Se generara un caption automatico al programar"
              : "Programar publicación en Instagram"
        }
        className="border-violet-500/40 text-violet-600 hover:bg-violet-500/10 hover:border-violet-500 disabled:opacity-40"
      >
        <span key={status} className="oc-enter-pop inline-flex items-center gap-2">
          {status === "saving" ? (
            <><Loader2 className="h-4 w-4 animate-spin" /><span>Guardando...</span></>
          ) : status === "done" ? (
            <><Check className="h-4 w-4" /><span>Programado</span></>
          ) : (
            <><CalendarClock className="h-4 w-4" /><span>Programar</span></>
          )}
        </span>
      </Button>

      {status === "error" && errorMsg && (
        <div className="absolute right-0 top-full z-50 mt-1 w-64 rounded-md bg-destructive px-3 py-2 text-xs text-destructive-foreground shadow-lg">
          {errorMsg}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-surface border border-border rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h2 className="text-base font-semibold mb-1">Programar publicación</h2>
            <p className="text-xs text-muted-foreground mb-4">
              El carrusel se publicará automáticamente en Instagram a la hora elegida.
            </p>
            <input
              type="datetime-local"
              value={value}
              min={minDatetimeValue()}
              onChange={(e) => setValue(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleConfirm}
                disabled={!value || status === "saving"}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                {status === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Programar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
