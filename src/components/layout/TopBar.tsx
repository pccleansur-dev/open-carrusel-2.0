"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Settings, Layers, Plug } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TopBarProps {
  title?: string;
  showBack?: boolean;
  editable?: boolean;
  onTitleChange?: (newTitle: string) => void;
  onSettingsClick?: () => void;
  onIntegrationsClick?: () => void;
  claudeAuthenticated?: boolean;
}

export function TopBar({
  title,
  showBack,
  editable,
  onTitleChange,
  onSettingsClick,
  onIntegrationsClick,
  claudeAuthenticated,
}: TopBarProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [relogging, setRelogging] = useState(false);

  const handleRelogin = useCallback(async () => {
    setRelogging(true);
    try {
      await fetch("/api/relogin", { method: "POST" });
    } finally {
      setTimeout(() => setRelogging(false), 3000);
    }
  }, []);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEditing = () => {
    setEditValue(title || "");
    setIsEditing(true);
  };

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  const handleSave = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== title) {
      onTitleChange?.(trimmed);
    } else {
      setEditValue(title || "");
    }
    setIsEditing(false);
  };

  return (
    <header className="h-14 border-b border-border bg-surface flex items-center px-4 gap-3 shrink-0">
      {showBack && (
        <Link href="/">
          <Button variant="ghost" size="icon" aria-label="Back to dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
      )}
      <div className="flex items-center gap-2 min-w-0">
        <Layers className="h-5 w-5 text-accent shrink-0" />
        {isEditing && editable ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") {
                setEditValue(title || "");
                setIsEditing(false);
              }
            }}
            className="font-semibold text-sm bg-transparent border-b-2 border-accent outline-none py-0.5 min-w-[120px]"
          />
        ) : (
          <span
            className={`font-semibold text-sm truncate ${editable ? "cursor-pointer hover:text-accent transition-colors" : ""}`}
            onClick={() => editable && startEditing()}
            title={editable ? "Click to rename" : undefined}
          >
            {title || "Open Carrusel"}
          </span>
        )}
      </div>
      <div className="flex-1" />
      {claudeAuthenticated === undefined ? (
        <span
          title="Verificando Claude..."
          className="h-2.5 w-2.5 rounded-full shrink-0 bg-muted-foreground/30 animate-pulse"
        />
      ) : claudeAuthenticated ? (
        <span
          title="Claude conectado"
          className="h-2.5 w-2.5 rounded-full shrink-0 bg-green-500"
        />
      ) : (
        <button
          onClick={() => void handleRelogin()}
          disabled={relogging}
          title={relogging ? "Abriendo terminal de login..." : "Claude desconectado — click para relogear"}
          className="h-2.5 w-2.5 rounded-full shrink-0 bg-red-500 hover:bg-red-400 transition-colors disabled:opacity-50 cursor-pointer"
        />
      )}
      {onIntegrationsClick && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onIntegrationsClick}
          aria-label="Integraciones"
          title="Integraciones"
        >
          <Plug className="h-4 w-4" />
        </Button>
      )}
      {onSettingsClick && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onSettingsClick}
          aria-label="Settings"
        >
          <Settings className="h-4 w-4" />
        </Button>
      )}
    </header>
  );
}
