"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DisputaStatus } from "@/lib/api";

interface HeaderDisputaProps {
  titulo: string;
  conectado: boolean;
  reconectando: boolean;
  status: DisputaStatus | null;
  urlPortal?: string | null;
  onTogglePausa: () => void;
}

function isPausada(status: DisputaStatus | null) {
  return status === "PAUSADA" || status === ("PAUSADO" as DisputaStatus);
}

export function HeaderDisputa({
  titulo,
  conectado,
  reconectando,
  status,
  urlPortal,
  onTogglePausa,
}: HeaderDisputaProps) {
  const pausada = isPausada(status);

  const conexao = reconectando
    ? { dot: "bg-amber-400 animate-pulse", label: "Reconectando..." }
    : conectado
      ? { dot: "bg-green-400 animate-pulse", label: "Conectado" }
      : { dot: "bg-red-500", label: "Desconectado" };

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
      <div className="px-4 py-3 flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-3">
          <Link href="/disputa">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </Link>
          <h1 className="text-sm md:text-base font-semibold text-foreground">{titulo}</h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-2.5 h-9 border border-border rounded-md flex items-center gap-2 text-sm text-foreground">
            <span className={`h-2 w-2 rounded-full ${conexao.dot}`} />
            {conexao.label}
          </div>

          <Button variant="outline" size="sm" className="gap-1.5" onClick={onTogglePausa}>
            {pausada ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            {pausada ? "Retomar Tudo" : "Pausar Tudo"}
          </Button>

          {urlPortal && (
            <a href={urlPortal} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm" className="gap-1.5">
                Ver no Portal
                <ExternalLink className="h-4 w-4" />
              </Button>
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
