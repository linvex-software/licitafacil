"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Flag,
  Gavel,
  MessageSquare,
  Scale,
  XCircle,
} from "lucide-react";
import { listarEventosLicitacao, type EventoLicitacao } from "@/lib/api";

const E = { neutral: { color: "text-foreground", bgColor: "bg-muted" } as const, risk: { color: "text-destructive", bgColor: "bg-destructive/10" } as const };

const EVENTO_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; color: string; bgColor: string }
> = {
  EDITAL_PUBLICADO: { label: "Edital publicado", icon: FileText, ...E.neutral },
  SESSAO_ABERTA: { label: "Sessão aberta", icon: Flag, ...E.neutral },
  ESCLARECIMENTO_PUBLICADO: { label: "Esclarecimento publicado", icon: MessageSquare, ...E.neutral },
  ADENDO_EMITIDO: { label: "Adendo emitido", icon: FileText, ...E.neutral },
  PRAZO_PROPOSTA_REABERTO: { label: "Prazo de proposta reaberto", icon: Clock, ...E.neutral },
  JULGAMENTO_ENCERRADO: { label: "Julgamento encerrado", icon: Gavel, ...E.neutral },
  JANELA_RECURSO_ABERTA: { label: "Janela de recurso aberta", icon: Clock, ...E.neutral },
  JANELA_RECURSO_ENCERRADA: { label: "Janela de recurso encerrada", icon: CheckCircle, ...E.neutral },
  INTENCAO_RECURSO_REGISTRADA: { label: "Intenção de recurso", icon: AlertTriangle, ...E.neutral },
  RECURSO_INTERPOSTO: { label: "Recurso interposto", icon: Scale, ...E.risk },
  RECURSO_DECIDIDO: { label: "Recurso decidido", icon: Gavel, ...E.neutral },
  CONTRA_RAZOES_APRESENTADAS: { label: "Contra-razões apresentadas", icon: FileText, ...E.neutral },
  SUSPENSA_POR_RECURSO: { label: "Suspensa por recurso", icon: XCircle, ...E.risk },
  SUSPENSAO_ENCERRADA: { label: "Suspensão encerrada", icon: CheckCircle, ...E.neutral },
  HABILITACAO_ANALISADA: { label: "Habilitação analisada", icon: CheckCircle, ...E.neutral },
  INABILITACAO_REGISTRADA: { label: "Inabilitação registrada", icon: XCircle, ...E.risk },
  ADJUDICACAO: { label: "Adjudicação", icon: Gavel, ...E.neutral },
  HOMOLOGACAO: { label: "Homologação", icon: CheckCircle, ...E.neutral },
  HOMOLOGACAO_ANULADA: { label: "Homologação anulada", icon: XCircle, ...E.risk },
  REVOGACAO: { label: "Revogação", icon: XCircle, ...E.risk },
  IMPUGNACAO_RECEBIDA: { label: "Impugnação recebida", icon: AlertTriangle, ...E.neutral },
  IMPUGNACAO_DECIDIDA: { label: "Impugnação decidida", icon: Gavel, ...E.neutral },
};

const getDetalheLabel = (tipo: string, detalhes?: Record<string, unknown> | null) => {
  if (!detalhes) return null;
  if (tipo === "RECURSO_INTERPOSTO" || tipo === "INTENCAO_RECURSO_REGISTRADA") {
    if (detalhes.autorTipo === "CIDADAO") return "Interposto por cidadão";
    if (detalhes.anonimo) return "Interposto anonimamente";
  }
  return null;
};

export function LicitacaoTimeline({ bidId }: { bidId: string }) {
  const [eventos, setEventos] = useState<EventoLicitacao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listarEventosLicitacao(bidId)
      .then((data) => setEventos(data))
      .finally(() => setLoading(false));
  }, [bidId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
      </div>
    );
  }

  if (eventos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="mb-3 rounded-full bg-gray-100 p-3 dark:bg-gray-800">
          <Clock className="h-5 w-5 text-gray-400" />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum evento registrado ainda.</p>
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          Os eventos serão registrados conforme o processo avança.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute bottom-0 left-5 top-0 w-px bg-gray-100 dark:bg-gray-800" />
      <div className="space-y-1">
        {eventos.map((evento, i) => {
          const config = EVENTO_CONFIG[evento.tipo] ?? {
            label: evento.tipo,
            icon: Clock,
            color: "text-gray-500",
            bgColor: "bg-gray-500/10",
          };
          const Icon = config.icon;
          const date = new Date(evento.timestamp);

          return (
            <div key={evento.id} className="relative flex gap-4 pl-2">
              <div
                className={`relative z-10 mt-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${config.bgColor}`}
              >
                <Icon className={`h-3.5 w-3.5 ${config.color}`} />
              </div>

              <div
                className={`mb-2 flex-1 rounded-xl border px-4 py-3 ${
                  i === eventos.length - 1
                    ? "border-white/20 bg-white/5"
                    : "border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p
                    className={`text-sm font-medium leading-snug ${
                      i === eventos.length - 1 ? "text-white" : "text-[#d4d4d8]"
                    }`}
                  >
                    {config.label}
                    {i === eventos.length - 1 && (
                      <span className="ml-2 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        ATUAL
                      </span>
                    )}
                  </p>
                  <span className="shrink-0 font-mono text-[11px] text-gray-400 dark:text-gray-500">
                    {date.toLocaleDateString("pt-BR")}{" "}
                    {date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                {(() => {
                  const label = getDetalheLabel(evento.tipo, evento.detalhes as Record<string, unknown> | null);
                  return label ? (
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{label}</p>
                  ) : null;
                })()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
