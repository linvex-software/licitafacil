"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/button";
import type { DisputaStatus } from "@/lib/api";
import type { StatusConexao, StatusExtensao } from "@/hooks/useDisputaSocket";
import type { ReactNode } from "react";

interface HeaderDisputaProps {
  titulo: string;
  statusConexao: StatusConexao;
  statusExtensao: StatusExtensao;
  status: DisputaStatus | null;
  urlPortal?: string | null;
  actions?: ReactNode;
}

export function HeaderDisputa({
  titulo,
  statusConexao,
  statusExtensao,
  status,
  urlPortal,
  actions,
}: HeaderDisputaProps) {
  const conexaoVariant =
    statusConexao === "conectado"
      ? "success"
      : statusConexao === "conectando"
        ? "warning"
        : "destructive";
  const extensaoVariant =
    statusExtensao === "conectada"
      ? "success"
      : statusExtensao === "desconhecida"
        ? "warning"
        : "destructive";

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
          <Badge variant={conexaoVariant}>WS: {statusConexao}</Badge>
          <Badge variant={extensaoVariant}>Extensão: {statusExtensao}</Badge>
          <Badge variant="secondary">Disputa: {status ?? "-"}</Badge>

          {actions}

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
