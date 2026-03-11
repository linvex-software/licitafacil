"use client";

import { useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import type { EventoDisputa } from "@/hooks/useDisputaSocket";

interface FeedEventosProps {
  eventos: EventoDisputa[];
  onLimpar: () => void;
}

function classNamePorTipo(tipo: string) {
  switch (tipo) {
    case "LANCE_ENVIADO":
      return "text-green-400";
    case "SAIU_LIDERANCA":
      return "text-amber-400 font-medium";
    case "CAPTCHA_DETECTADO":
      return "text-red-400 font-bold";
    case "ITEM_ENCERRADO_GANHOU":
      return "text-green-400 font-bold";
    case "ITEM_ENCERRADO_PERDEU":
      return "text-red-400";
    case "ERRO":
      return "text-red-400";
    default:
      return "text-muted-foreground";
  }
}

export function FeedEventos({ eventos, onLimpar }: FeedEventosProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const ordenados = useMemo(() => [...eventos].reverse(), [eventos]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [ordenados]);

  return (
    <div className="bg-card border border-border rounded-lg h-full flex flex-col overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Feed de eventos</h2>
        <Button size="sm" variant="ghost" onClick={onLimpar}>
          Limpar
        </Button>
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs">
        {ordenados.length === 0 && (
          <p className="text-muted-foreground">Aguardando eventos em tempo real...</p>
        )}

        {ordenados.map((evento, index) => (
          <div key={`${evento.timestamp}-${index}`} className="flex gap-2">
            <span className="text-muted-foreground shrink-0">
              {new Date(evento.timestamp).toLocaleTimeString("pt-BR")}
            </span>
            <p className={classNamePorTipo(evento.tipo)}>
              {evento.descricao}
              {typeof evento.valor === "number" ? ` R$${evento.valor.toLocaleString("pt-BR")}` : ""}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
