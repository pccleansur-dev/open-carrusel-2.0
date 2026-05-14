"use client";

import { useState, useEffect } from "react";
import { X, Check, Loader2, Webhook, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface IntegrationsConfig {
  makeWebhookUrl: string;
  igUserId: string;
}

interface IntegrationsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function IntegrationsPanel({ open, onClose }: IntegrationsPanelProps) {
  const [config, setConfig] = useState<IntegrationsConfig>({
    makeWebhookUrl: "",
    igUserId: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/integrations")
      .then((response) => response.json())
      .then((data: IntegrationsConfig) => setConfig(data))
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
      <div className="bg-surface border border-border rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold">Integraciones</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
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
              className="text-xs font-mono"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Webhook del escenario &quot;Open Carrusel → Telegraph → Instagram&quot; en Make
            </p>
          </div>

          <div>
            <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
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
              className="text-xs font-mono"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              ID numérico de tu cuenta Instagram Business (@pccleanok = 17841445339772957)
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : saved ? (
              <>
                <Check className="h-3.5 w-3.5 mr-1" /> Guardado
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
