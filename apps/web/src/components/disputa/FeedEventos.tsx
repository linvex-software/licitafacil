"use client";

import { useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import type { EventoAoVivo } from "@/hooks/useDisputaSocket";

interface FeedEventosProps {
  eventos: EventoAoVivo[];
  onLimpar: () => void;
}

function classNameSeveridade(severidade: EventoAoVivo["severidade"]) {
  if (severidade === "ok") return "text-teal-400";
  if (severidade === "warn") return "text-amber-400";
  if (severidade === "danger") return "text-red-400";
  return "text-blue-300";
}

function classNameTipo(evento: EventoAoVivo) {
  if (evento.tipo === "LANCE_CONFIRMADO") return "text-teal-400";
  if (evento.tipo === "POSICAO_PERDIDA") return "text-amber-400";
  if (evento.tipo === "ITEM_ENCERRADO") return "text-slate-400";
  if (evento.tipo === "MENSAGEM") return "text-blue-300";
  return classNameSeveridade(evento.severidade);
}

function relativo(ts: number) {
  const sec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (sec < 60) return `há ${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `há ${min}min`;
  const h = Math.floor(min / 60);
  return `há ${h}h`;
}

export function FeedEventos({ eventos, onLimpar }: FeedEventosProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const ordenados = useMemo(() => eventos.slice(-200), [eventos]);

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

        {ordenados.map((evento) => (
          <div key={evento.id} className="flex gap-2">
            <span className="text-muted-foreground shrink-0">
              {relativo(evento.ts)}
            </span>
            <p className={classNameTipo(evento)}>
              {evento.texto}
              {typeof evento.valor === "number"
                ? ` (${evento.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })})`
                : ""}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
