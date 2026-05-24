"use client";

import { useState, useEffect } from "react";
import { X, Check, Loader2, Webhook, Hash, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface IntegrationsConfig {
  makeWebhookUrl: string;
  igUserId: string;
  postsDirectory: string;
  makeResponsePostIdPath: string;
  makeResponsePostUrlPath: string;
  effectivePostsDirectory?: string;
  dockerPostsDirectoryHost?: string;
}

interface IntegrationsPanelProps {
  open: boolean;
  onClose: () => void;
}

const EMPTY_CONFIG: IntegrationsConfig = {
  makeWebhookUrl: "",
  igUserId: "",
  postsDirectory: "",
  makeResponsePostIdPath: "",
  makeResponsePostUrlPath: "",
};

export function IntegrationsPanel({ open, onClose }: IntegrationsPanelProps) {
  const [config, setConfig] = useState<IntegrationsConfig>(EMPTY_CONFIG);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/integrations")
      .then((response) => response.json())
      .then((data: Partial<IntegrationsConfig>) =>
        setConfig({
          ...EMPTY_CONFIG,
          ...data,
        })
      )
      .catch(() => {});
  }, [open]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/integrations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-base font-semibold">Integraciones</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Webhook className="h-3.5 w-3.5" />
              Make Webhook URL
            </label>
            <Input
              value={config.makeWebhookUrl}
              onChange={(event) =>
                setConfig((current) => ({
                  ...current,
                  makeWebhookUrl: event.target.value,
                }))
              }
              placeholder="https://hook.eu2.make.com/..."
              className="font-mono text-xs"
            />
            <p className="mt-1 text-[10px] text-muted-foreground">
              Webhook del escenario &quot;Open Carrusel - Telegraph - Instagram&quot; en Make
            </p>
          </div>

          <div>
            <label className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Hash className="h-3.5 w-3.5" />
              Instagram User ID
            </label>
            <Input
              value={config.igUserId}
              onChange={(event) =>
                setConfig((current) => ({
                  ...current,
                  igUserId: event.target.value,
                }))
              }
              placeholder="17841445339772957"
              className="font-mono text-xs"
            />
            <p className="mt-1 text-[10px] text-muted-foreground">
              ID numerico de tu cuenta Instagram Business.
            </p>
          </div>

          <div>
            <label className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <FolderOpen className="h-3.5 w-3.5" />
              Carpeta de posteos
            </label>
            <Input
              value={config.postsDirectory}
              onChange={(event) =>
                setConfig((current) => ({
                  ...current,
                  postsDirectory: event.target.value,
                }))
              }
              placeholder="C:\\Posteos\\Open Carrusel o ./mis-posteos"
              className="font-mono text-xs"
            />
            <p className="mt-1 text-[10px] text-muted-foreground">
              Ruta guardada en la app. Si Docker define `POSTS_DIRECTORY`, esa sera la
              ruta interna efectiva de guardado.
            </p>
            {config.effectivePostsDirectory ? (
              <p className="mt-1 text-[10px] text-muted-foreground">
                Ruta efectiva: <span className="font-mono">{config.effectivePostsDirectory}</span>
              </p>
            ) : null}
            {config.dockerPostsDirectoryHost ? (
              <p className="mt-1 text-[10px] text-muted-foreground">
                Carpeta mapeada en Docker:{" "}
                <span className="font-mono">{config.dockerPostsDirectoryHost}</span>
              </p>
            ) : null}
          </div>

          <div>
            <label className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Webhook className="h-3.5 w-3.5" />
              Campo response Post ID
            </label>
            <Input
              value={config.makeResponsePostIdPath}
              onChange={(event) =>
                setConfig((current) => ({
                  ...current,
                  makeResponsePostIdPath: event.target.value,
                }))
              }
              placeholder="data.post.id o result[0].media_id"
              className="font-mono text-xs"
            />
            <p className="mt-1 text-[10px] text-muted-foreground">
              Ruta JSON opcional para leer explicitamente el ID del post devuelto por Make.
            </p>
          </div>

          <div>
            <label className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Webhook className="h-3.5 w-3.5" />
              Campo response Post URL
            </label>
            <Input
              value={config.makeResponsePostUrlPath}
              onChange={(event) =>
                setConfig((current) => ({
                  ...current,
                  makeResponsePostUrlPath: event.target.value,
                }))
              }
              placeholder="data.post.permalink o result[0].url"
              className="font-mono text-xs"
            />
            <p className="mt-1 text-[10px] text-muted-foreground">
              Ruta JSON opcional para leer explicitamente la URL/permalink del post.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : saved ? (
              <>
                <Check className="mr-1 h-3.5 w-3.5" /> Guardado
              </>
            ) : (
              "Guardar"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
