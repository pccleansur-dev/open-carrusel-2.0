"use client";

import { useState, useEffect } from "react";
import { X, Check, Loader2, Webhook, Hash, FolderOpen, TableProperties, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface IntegrationsConfig {
  publishProvider: "make" | "postwiz";
  makeWebhookUrl: string;
  igUserId: string;
  postsDirectory: string;
  makeResponsePostIdPath: string;
  makeResponsePostUrlPath: string;
  postwizBaseUrl: string;
  postwizApiKey: string;
  postwizIntegrationId: string;
  postwizInstagramEnabled: boolean;
  postwizFacebookEnabled: boolean;
  postwizFacebookIntegrationId: string;
  postwizFacebookUrl: string;
  postwizProviderType: "instagram" | "instagram-standalone";
  postwizPostType: "post" | "story";
  googleSheetsCsvUrl: string;
  effectivePostsDirectory?: string;
  dockerPostsDirectoryHost?: string;
}

interface IntegrationsPanelProps {
  open: boolean;
  onClose: () => void;
}

const EMPTY_CONFIG: IntegrationsConfig = {
  publishProvider: "make",
  makeWebhookUrl: "",
  igUserId: "",
  postsDirectory: "",
  makeResponsePostIdPath: "",
  makeResponsePostUrlPath: "",
  postwizBaseUrl: "https://postwiz.wizzi.com.ar/api/public/v1",
  postwizApiKey: "",
  postwizIntegrationId: "",
  postwizInstagramEnabled: true,
  postwizFacebookEnabled: false,
  postwizFacebookIntegrationId: "",
  postwizFacebookUrl: "",
  postwizProviderType: "instagram",
  postwizPostType: "post",
  googleSheetsCsvUrl: "",
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
      <div className="mx-4 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-border bg-surface p-6 shadow-xl">
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
              <Send className="h-3.5 w-3.5" />
              Proveedor de publicacion
            </label>
            <select
              value={config.publishProvider}
              onChange={(event) =>
                setConfig((current) => ({
                  ...current,
                  publishProvider: event.target.value === "postwiz" ? "postwiz" : "make",
                }))
              }
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="postwiz">PostWiz / Postiz</option>
              <option value="make">Make webhook</option>
            </select>
            <p className="mt-1 text-[10px] text-muted-foreground">
              PostWiz programa directamente en tu VPS. Make conserva el flujo anterior.
            </p>
          </div>

          <div className="rounded-lg border border-border p-3">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <Send className="h-3.5 w-3.5" />
              PostWiz / Postiz
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                  API base URL
                </label>
                <Input
                  value={config.postwizBaseUrl}
                  onChange={(event) =>
                    setConfig((current) => ({
                      ...current,
                      postwizBaseUrl: event.target.value,
                    }))
                  }
                  placeholder="https://postwiz.wizzi.com.ar/api/public/v1"
                  className="font-mono text-xs"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                  API key
                </label>
                <Input
                  value={config.postwizApiKey}
                  onChange={(event) =>
                    setConfig((current) => ({
                      ...current,
                      postwizApiKey: event.target.value,
                    }))
                  }
                  placeholder="Token creado en PostWiz"
                  className="font-mono text-xs"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center gap-2">
                  <input
                    id="postwiz-instagram-enabled"
                    type="checkbox"
                    checked={config.postwizInstagramEnabled}
                    onChange={(event) =>
                      setConfig((current) => ({
                        ...current,
                        postwizInstagramEnabled: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-border"
                  />
                  <label
                    htmlFor="postwiz-instagram-enabled"
                    className="text-[11px] font-medium text-muted-foreground"
                  >
                    Publicar en Instagram
                  </label>
                </div>
                {config.postwizInstagramEnabled ? (
                  <>
                    <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                      Instagram Integration ID
                    </label>
                    <Input
                      value={config.postwizIntegrationId}
                      onChange={(event) =>
                        setConfig((current) => ({
                          ...current,
                          postwizIntegrationId: event.target.value,
                        }))
                      }
                      placeholder="ID de tu canal Instagram"
                      className="font-mono text-xs"
                    />
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      Se obtiene con GET /api/public/v1/integrations usando tu API key.
                    </p>
                  </>
                ) : null}
              </div>

              {config.postwizInstagramEnabled ? (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                    Tipo de canal
                  </label>
                  <select
                    value={config.postwizProviderType}
                    onChange={(event) =>
                      setConfig((current) => ({
                        ...current,
                        postwizProviderType:
                          event.target.value === "instagram-standalone"
                            ? "instagram-standalone"
                            : "instagram",
                      }))
                    }
                    className="w-full rounded-md border border-border bg-background px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="instagram">Instagram</option>
                    <option value="instagram-standalone">Instagram standalone</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                    Formato
                  </label>
                  <select
                    value={config.postwizPostType}
                    onChange={(event) =>
                      setConfig((current) => ({
                        ...current,
                        postwizPostType: event.target.value === "story" ? "story" : "post",
                      }))
                    }
                    className="w-full rounded-md border border-border bg-background px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="post">Post</option>
                    <option value="story">Story</option>
                  </select>
                </div>
              </div>
              ) : null}

              <div className="rounded-md border border-border/80 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <input
                    id="postwiz-facebook-enabled"
                    type="checkbox"
                    checked={config.postwizFacebookEnabled}
                    onChange={(event) =>
                      setConfig((current) => ({
                        ...current,
                        postwizFacebookEnabled: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-border"
                  />
                  <label
                    htmlFor="postwiz-facebook-enabled"
                    className="text-[11px] font-medium text-muted-foreground"
                  >
                    Publicar tambien en Facebook
                  </label>
                </div>

                {config.postwizFacebookEnabled ? (
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                        Facebook Integration ID
                      </label>
                      <Input
                        value={config.postwizFacebookIntegrationId}
                        onChange={(event) =>
                          setConfig((current) => ({
                            ...current,
                            postwizFacebookIntegrationId: event.target.value,
                          }))
                        }
                        placeholder="ID de tu pagina/canal Facebook"
                        className="font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                        URL opcional para Facebook
                      </label>
                      <Input
                        value={config.postwizFacebookUrl}
                        onChange={(event) =>
                          setConfig((current) => ({
                            ...current,
                            postwizFacebookUrl: event.target.value,
                          }))
                        }
                        placeholder="https://..."
                        className="font-mono text-xs"
                      />
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        Si la dejas vacia, Facebook recibe solo copy e imagenes.
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div>
            <label className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <TableProperties className="h-3.5 w-3.5" />
              Google Sheets URL
            </label>
            <Input
              value={config.googleSheetsCsvUrl}
              onChange={(event) =>
                setConfig((current) => ({
                  ...current,
                  googleSheetsCsvUrl: event.target.value,
                }))
              }
              placeholder="https://docs.google.com/spreadsheets/d/.../edit#gid=0"
              className="font-mono text-xs"
            />
            <p className="mt-1 text-[10px] text-muted-foreground">
              Pega la URL normal de la pestaña de planning. La app convierte sola el link a CSV para leerlo en vivo.
            </p>
          </div>

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
