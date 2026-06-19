"use client";

import { useState, useCallback } from "react";
import { ImagePlus, Loader2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReferenceImage } from "@/types/carousel";

interface ReferenceImagesProps {
  carouselId: string;
  images: ReferenceImage[];
  onImagesChange: () => void;
}

export function ReferenceImages({
  carouselId,
  images,
  onImagesChange,
}: ReferenceImagesProps) {
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generatePrompt, setGeneratePrompt] = useState("");
  const [generateQuality, setGenerateQuality] = useState<"low" | "medium" | "high">("medium");
  const [generateError, setGenerateError] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleUpload = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        // Upload the file
        const formData = new FormData();
        formData.append("file", file);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        if (!uploadRes.ok) return;
        const uploadData = await uploadRes.json();

        // Register as reference image
        await fetch(`/api/carousels/${carouselId}/references`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: uploadData.url,
            name: file.name,
          }),
        });

        onImagesChange();
      } catch {
        // ignore
      } finally {
        setUploading(false);
      }
    },
    [carouselId, onImagesChange]
  );

  const handleRemove = useCallback(
    async (imageId: string) => {
      await fetch(
        `/api/carousels/${carouselId}/references?imageId=${imageId}`,
        { method: "DELETE" }
      );
      onImagesChange();
    },
    [carouselId, onImagesChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) handleUpload(file);
    },
    [handleUpload]
  );

  const handleClick = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/webp";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleUpload(file);
    };
    input.click();
  }, [handleUpload]);

  const handleGenerate = useCallback(async () => {
    const prompt = generatePrompt.trim();
    if (!prompt || generating) return;

    setGenerating(true);
    setGenerateError("");

    try {
      const response = await fetch(`/api/carousels/${carouselId}/references/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          quality: generateQuality,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "No se pudo generar la imagen");
      }

      setGeneratePrompt("");
      setGenerateOpen(false);
      onImagesChange();
    } catch (error) {
      setGenerateError(error instanceof Error ? error.message : "Error desconocido");
    } finally {
      setGenerating(false);
    }
  }, [carouselId, generatePrompt, generateQuality, generating, onImagesChange]);

  return (
    <div className="border-b border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-xs font-medium text-muted-foreground">
          Reference Images
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setGenerateOpen(true)}
            disabled={generating}
            className="h-6 gap-1 px-2 text-xs"
            title="Generar imagen con IA"
          >
            {generating ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            IA
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClick}
            disabled={uploading}
            className="h-6 gap-1 px-2 text-xs"
            title="Subir imagen de referencia"
          >
            <ImagePlus className="h-3 w-3" />
            {uploading ? "Uploading..." : "Add"}
          </Button>
        </div>
      </div>

      {/* Images grid or drop zone */}
      {images.length === 0 ? (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={handleClick}
          className="mx-4 mb-3 border border-dashed border-border rounded-lg p-3 text-center cursor-pointer hover:border-muted-foreground/50 hover:bg-muted/30 transition-colors"
        >
          <ImagePlus className="h-4 w-4 mx-auto text-muted-foreground/50 mb-1" />
          <p className="text-[10px] text-muted-foreground">
            Drop reference images here
          </p>
          <p className="text-[9px] text-muted-foreground/70">
            The AI will study these to match your style
          </p>
        </div>
      ) : (
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
          {images.map((img) => (
            <div key={img.id} className="oc-enter-pop relative group shrink-0">
              <button
                onClick={() => setPreviewUrl(previewUrl === img.url ? null : img.url)}
                className="block w-14 h-14 rounded-lg overflow-hidden border border-border hover:border-accent transition-colors"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.name}
                  className="w-full h-full object-cover"
                />
              </button>
              {/* Remove button */}
              <button
                onClick={() => handleRemove(img.id)}
                className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label={`Remove ${img.name}`}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
          {/* Add more button */}
          <button
            onClick={handleClick}
            className="shrink-0 w-14 h-14 rounded-lg border border-dashed border-border flex items-center justify-center hover:border-muted-foreground/50 transition-colors"
          >
            <ImagePlus className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Preview modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-8"
          onClick={() => setPreviewUrl(null)}
        >
          <div className="relative max-w-2xl max-h-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Reference preview"
              className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
            />
            <button
              onClick={() => setPreviewUrl(null)}
              className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-white text-foreground flex items-center justify-center shadow-lg"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {generateOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" />
                <h3 className="text-sm font-semibold">Generar imagen</h3>
              </div>
              <button
                type="button"
                onClick={() => setGenerateOpen(false)}
                disabled={generating}
                className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
              Prompt
            </label>
            <textarea
              value={generatePrompt}
              onChange={(event) => setGeneratePrompt(event.target.value)}
              placeholder="Ej: Fondo editorial realista de escritorio creativo, luz natural, plantas, laptop, estilo premium..."
              rows={5}
              className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition-shadow focus:ring-2 focus:ring-accent"
              disabled={generating}
            />

            <div className="mt-3">
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                Calidad
              </label>
              <select
                value={generateQuality}
                onChange={(event) =>
                  setGenerateQuality(event.target.value as "low" | "medium" | "high")
                }
                disabled={generating}
                className="h-10 w-full rounded-md border border-border bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
              >
                <option value="low">Borrador</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
              </select>
            </div>

            {generateError ? (
              <div className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {generateError}
              </div>
            ) : null}

            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setGenerateOpen(false)}
                disabled={generating}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => void handleGenerate()}
                disabled={generating || generatePrompt.trim().length < 8}
              >
                {generating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    Generar
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
