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
import type { BidPredictionResult, FatorAnalise } from "@/hooks/use-bid-prediction";

// ─────────────────────────────────────────────────────────────────────────────
// Configurações visuais
// ─────────────────────────────────────────────────────────────────────────────

const RECOMENDACAO_CONFIG = {
  PARTICIPAR: {
    label: "Recomendamos Participar",
    description: "As condições são favoráveis para esta licitação.",
    icon: TrendingUp,
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
    headerClass: "from-emerald-50 to-white dark:from-emerald-950/30 dark:to-gray-900",
    scoreClass: "text-emerald-600 dark:text-emerald-400",
    iconClass: "text-emerald-600 dark:text-emerald-400",
  },
  ANALISAR: {
    label: "Analise com Cuidado",
    description: "Há pontos de atenção que merecem avaliação antes de decidir.",
    icon: Minus,
    badgeClass: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
    headerClass: "from-amber-50 to-white dark:from-amber-950/30 dark:to-gray-900",
    scoreClass: "text-amber-600 dark:text-amber-400",
    iconClass: "text-amber-600 dark:text-amber-400",
  },
  DESCARTAR: {
    label: "Não Recomendamos",
    description: "As condições atuais não são favoráveis para participar.",
    icon: TrendingDown,
    badgeClass: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
    headerClass: "from-red-50 to-white dark:from-red-950/30 dark:to-gray-900",
    scoreClass: "text-red-600 dark:text-red-400",
    iconClass: "text-red-600 dark:text-red-400",
  },
} as const;

function getFatorIcon(score: number) {
  if (score >= 70) return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />;
  if (score >= 40) return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
  return <XCircle className="w-4 h-4 text-red-500 shrink-0" />;
}

function getFatorScoreColor(score: number) {
  if (score >= 70) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 40) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente de fator individual
// ─────────────────────────────────────────────────────────────────────────────

function FatorCard({ fator }: { fator: FatorAnalise }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
        onClick={() => setExpanded(!expanded)}
      >
        {getFatorIcon(fator.score)}

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {fator.nome}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-gray-500 dark:text-gray-400">
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
          <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-0 border-t border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/20">
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 mb-1">{fator.descricao}</p>
          <p className="text-sm text-gray-700 dark:text-gray-300">{fator.detalhe}</p>

          {fator.dados && Object.keys(fator.dados).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(fator.dados)
                .filter(([, v]) => v !== null && v !== undefined && typeof v !== "object")
                .slice(0, 4)
                .map(([key, value]) => (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-2 py-0.5 text-gray-600 dark:text-gray-400"
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
  prediction: BidPredictionResult | null | undefined;
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
            config?.headerClass ?? "from-gray-50 to-white dark:from-gray-900 dark:to-gray-900",
          )}
        >
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <DialogTitle className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                  Análise Preditiva de Sucesso
                </DialogTitle>
                {bidTitle && (
                  <DialogDescription className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
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
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">/ 100</span>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={cn("w-5 h-5", config.iconClass)} />
                    <span className={cn("font-bold text-base", config.scoreClass)}>
                      {config.label}
                    </span>
                  </div>
                  <PredictionScoreBar score={prediction.score} />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {config.description}
                  </p>
                </div>
              </div>
            )}

            {/* Estado vazio */}
            {!prediction && !isLoading && !isAnalyzing && (
              <div className="mt-4 text-center py-6">
                <Sparkles className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Nenhuma análise realizada ainda. Clique em "Analisar" para obter uma previsão de sucesso baseada em 6 fatores.
                </p>
                <Button onClick={onAnalisar} disabled={isAnalyzing}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Analisar Agora
                </Button>
              </div>
            )}

            {/* Loading state */}
            {(isLoading || isAnalyzing) && !prediction && (
              <div className="mt-4 text-center py-6">
                <RefreshCw className="w-8 h-8 text-purple-400 mx-auto mb-3 animate-spin" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {isAnalyzing ? "Calculando 6 fatores com IA..." : "Carregando análise..."}
                </p>
              </div>
            )}
          </DialogHeader>
        </div>

        {prediction && (
          <div className="p-6 pt-4 space-y-5">
            {/* Explicação da IA */}
            {prediction.explicacao && (
              <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-purple-700 dark:text-purple-400 mb-1 uppercase tracking-wide">
                      Avaliação da IA
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      {prediction.explicacao}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <Separator />

            {/* Fatores de análise */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
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
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    Ações Recomendadas
                  </h3>
                  <ul className="space-y-2">
                    {prediction.acoes.map((acao, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold flex items-center justify-center mt-0.5">
                          {i + 1}
                        </span>
                        <span className="text-sm text-gray-700 dark:text-gray-300">{acao}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {/* Rodapé com metadados */}
            <Separator />
            <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
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
