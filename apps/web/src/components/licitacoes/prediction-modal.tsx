"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/Badge";
import { Separator } from "@/components/ui/separator";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PredictionScoreBar } from "./prediction-badge";
import type { BidPrediction, FatorAnalise } from "@/lib/api";

// ─────────────────────────────────────────────────────────────────────────────
// Configurações visuais
// ─────────────────────────────────────────────────────────────────────────────

const RECOMENDACAO_CONFIG = {
  PARTICIPAR: {
    label: "Recomendamos Participar",
    description: "As condições são favoráveis para esta licitação.",
    icon: TrendingUp,
    badgeClass: "border-border bg-muted text-foreground",
    headerClass: "from-muted to-background dark:from-muted/40 dark:to-background",
    scoreClass: "text-foreground",
    iconClass: "text-foreground",
  },
  ANALISAR: {
    label: "Analise com Cuidado",
    description: "Há pontos de atenção que merecem avaliação antes de decidir.",
    icon: Minus,
    badgeClass: "border-border bg-muted text-muted-foreground",
    headerClass: "from-muted to-background dark:from-muted/40 dark:to-background",
    scoreClass: "text-muted-foreground",
    iconClass: "text-muted-foreground",
  },
  DESCARTAR: {
    label: "Não Recomendamos",
    description: "As condições atuais não são favoráveis para participar.",
    icon: TrendingDown,
    badgeClass: "border-destructive/30 bg-destructive/10 text-destructive",
    headerClass: "from-destructive/10 to-background dark:from-destructive/15 dark:to-background",
    scoreClass: "text-destructive",
    iconClass: "text-destructive",
  },
} as const;

function getFatorIcon(score: number) {
  if (score >= 70) return <CheckCircle2 className="h-4 w-4 shrink-0 text-foreground" />;
  if (score >= 40) return <AlertTriangle className="h-4 w-4 shrink-0 text-muted-foreground" />;
  return <XCircle className="h-4 w-4 shrink-0 text-destructive" />;
}

function getFatorScoreColor(score: number) {
  if (score >= 70) return "text-foreground";
  if (score >= 40) return "text-muted-foreground";
  return "text-destructive";
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente de fator individual
// ─────────────────────────────────────────────────────────────────────────────

function FatorCard({ fator }: { fator: FatorAnalise }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <button
        className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-accent/50"
        onClick={() => setExpanded(!expanded)}
      >
        {getFatorIcon(fator.score)}

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-medium text-foreground">
              {fator.nome}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-muted-foreground">
                {Math.round(fator.peso * 100)}%
              </span>
              <span className={cn("text-sm font-bold tabular-nums", getFatorScoreColor(fator.score))}>
                {fator.score}/100
              </span>
            </div>
          </div>
          <PredictionScoreBar score={fator.score} className="mt-1.5" />
        </div>

        {expanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-border bg-muted/30 px-3 pb-3 pt-0">
          <p className="mb-1 mt-2 text-xs text-muted-foreground">{fator.descricao}</p>
          <p className="text-sm text-foreground">{fator.detalhe}</p>

          {fator.dados && Object.keys(fator.dados).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(fator.dados)
                .filter(([, v]) => v !== null && v !== undefined && typeof v !== "object")
                .slice(0, 4)
                .map(([key, value]) => (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1 rounded border border-border bg-card px-2 py-0.5 text-xs text-muted-foreground"
                  >
                    <span className="font-medium capitalize">{key.replace(/([A-Z])/g, " $1").trim()}:</span>
                    <span>{String(value)}</span>
                  </span>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal principal
// ─────────────────────────────────────────────────────────────────────────────

interface PredictionModalProps {
  open: boolean;
  onClose: () => void;
  prediction: BidPrediction | null | undefined;
  isLoading?: boolean;
  isAnalyzing?: boolean;
  onAnalisar: () => void;
  bidTitle?: string;
}

export function PredictionModal({
  open,
  onClose,
  prediction,
  isLoading = false,
  isAnalyzing = false,
  onAnalisar,
  bidTitle,
}: PredictionModalProps) {
  const config = prediction ? RECOMENDACAO_CONFIG[prediction.recomendacao] : null;
  const Icon = config?.icon;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header com gradiente baseado na recomendação */}
        <div
          className={cn(
            "bg-gradient-to-b p-6 pb-4",
            config?.headerClass ?? "from-muted/50 to-background",
          )}
        >
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
                  <Sparkles className="h-5 w-5 text-muted-foreground" />
                  Análise Preditiva de Sucesso
                  <span className="ml-2 rounded border border-border bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                    Beta
                  </span>
                </DialogTitle>
                {bidTitle && (
                  <DialogDescription className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {bidTitle}
                  </DialogDescription>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={onAnalisar}
                disabled={isAnalyzing}
                className="shrink-0"
              >
                <RefreshCw className={cn("w-4 h-4 mr-2", isAnalyzing && "animate-spin")} />
                {isAnalyzing ? "Analisando..." : prediction ? "Reanalisar" : "Analisar"}
              </Button>
            </div>

            {/* Score principal */}
            {prediction && config && Icon && (
              <div className="mt-4 flex items-center gap-4">
                <div className="flex flex-col items-center">
                  <span className={cn("text-5xl font-black tabular-nums", config.scoreClass)}>
                    {prediction.score}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">/ 100</span>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={cn("w-5 h-5", config.iconClass)} />
                    <span className={cn("font-bold text-base", config.scoreClass)}>
                      {config.label}
                    </span>
                  </div>
                  <PredictionScoreBar score={prediction.score} />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {config.description}
                  </p>
                </div>
              </div>
            )}

            {/* Estado vazio */}
            {!prediction && !isLoading && !isAnalyzing && (
              <div className="mt-4 py-6 text-center">
                <Sparkles className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="mb-4 text-sm text-muted-foreground">
                  Nenhuma análise realizada ainda. Clique em &quot;Analisar&quot; para obter uma previsão de sucesso baseada em 6 fatores.
                </p>
                <Button onClick={onAnalisar} disabled={isAnalyzing}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Analisar Agora
                </Button>
              </div>
            )}

            {/* Loading state */}
            {(isLoading || isAnalyzing) && !prediction && (
              <div className="mt-4 py-6 text-center">
                <RefreshCw className="mx-auto mb-3 h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {isAnalyzing ? "Calculando 6 fatores com IA..." : "Carregando análise..."}
                </p>
              </div>
            )}
          </DialogHeader>
        </div>

        {prediction && (
          <div className="p-6 pt-4 space-y-5">
            {/* Aviso Permanente de Limitações da IA */}
            <div className="flex gap-3 rounded-lg border border-border bg-muted p-3 text-sm text-muted-foreground lg:p-4">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <div>
                <strong className="block mb-1">Aviso Importante:</strong>
                Esta predição é <strong>gerada por Inteligência Artificial</strong> com base nos <em>documentos e prazos</em> da licitação, e pode conter imprecisões. Use como auxílio à decisão, não como fator único. É crucial que você tenha rodado a análise de edital e configurado os prazos previamente para melhor precisão.
              </div>
            </div>

            {/* Explicação da IA */}
            {prediction.explicacao && (
              <div className="rounded-lg border border-border bg-muted/50 p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-foreground">
                      Avaliação da IA
                    </p>
                    <p className="text-sm leading-relaxed text-foreground">
                      {prediction.explicacao}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <Separator />

            {/* Fatores de análise */}
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <span>Breakdown dos 6 Fatores</span>
                <Badge variant="outline" className="text-xs font-normal">
                  Clique para expandir
                </Badge>
              </h3>
              <div className="space-y-2">
                {prediction.fatores.map((fator) => (
                  <FatorCard key={fator.nome} fator={fator} />
                ))}
              </div>
            </div>

            {/* Ações recomendadas */}
            {prediction.acoes && prediction.acoes.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Lightbulb className="h-4 w-4 text-muted-foreground" />
                    Ações Recomendadas
                  </h3>
                  <ul className="space-y-2">
                    {prediction.acoes.map((acao, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-foreground">
                          {i + 1}
                        </span>
                        <span className="text-sm text-foreground">{acao}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {/* Rodapé com metadados */}
            <Separator />
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>
                {`Analisado em ${format(new Date(prediction.updatedAt), "dd/MM/yyyy 'às' HH:mm", {
                  locale: ptBR,
                })}`}
              </span>
            </div>

          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
