"use client";

import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, Loader2 } from "lucide-react";
import type { BidPredictionResult } from "@/hooks/use-bid-prediction";

interface PredictionBadgeProps {
  prediction: BidPredictionResult | null | undefined;
  isLoading?: boolean;
  size?: "sm" | "md";
  showLabel?: boolean;
  className?: string;
}

const RECOMENDACAO_CONFIG = {
  PARTICIPAR: {
    label: "Participar",
    color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-800",
    icon: TrendingUp,
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  ANALISAR: {
    label: "Analisar",
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800",
    icon: Minus,
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  DESCARTAR: {
    label: "Descartar",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    border: "border-red-200 dark:border-red-800",
    icon: TrendingDown,
    iconColor: "text-red-600 dark:text-red-400",
  },
} as const;

/**
 * Badge compacto que exibe o score preditivo e a recomendação.
 * Usado nas listas de licitações e no card de detalhe.
 */
export function PredictionBadge({
  prediction,
  isLoading = false,
  size = "sm",
  showLabel = true,
  className,
}: PredictionBadgeProps) {
  if (isLoading) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5",
          "bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
          size === "md" && "px-3 py-1",
          className,
        )}
      >
        <Loader2 className="w-3 h-3 animate-spin" />
        {showLabel && <span className="text-xs font-medium">Analisando...</span>}
      </span>
    );
  }

  if (!prediction) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5",
          "bg-gray-100 text-gray-400 border-gray-200 dark:bg-gray-800 dark:text-gray-500 dark:border-gray-700",
          size === "md" && "px-3 py-1",
          className,
        )}
        title="Clique em 'Analisar Probabilidade' para obter uma previsão de sucesso"
      >
        <span className="text-xs">—</span>
        {showLabel && <span className="text-xs font-medium">Sem análise</span>}
      </span>
    );
  }

  const config = RECOMENDACAO_CONFIG[prediction.recomendacao];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium",
        config.color,
        config.border,
        size === "sm" && "px-2 py-0.5 text-xs",
        size === "md" && "px-3 py-1 text-sm",
        className,
      )}
      title={`Score: ${prediction.score}/100 — ${config.label}`}
    >
      <Icon className={cn("shrink-0", size === "sm" ? "w-3 h-3" : "w-4 h-4", config.iconColor)} />
      <span className="tabular-nums font-bold">{prediction.score}</span>
      {showLabel && <span>— {config.label}</span>}
    </span>
  );
}

/**
 * Barra de progresso visual do score (0-100)
 */
export function PredictionScoreBar({
  score,
  className,
}: {
  score: number;
  className?: string;
}) {
  const getColor = (s: number) => {
    if (s >= 70) return "bg-emerald-500";
    if (s >= 40) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <div className={cn("w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2", className)}>
      <div
        className={cn("h-2 rounded-full transition-all duration-500", getColor(score))}
        style={{ width: `${score}%` }}
      />
    </div>
  );
}
