"use client";

import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, Loader2 } from "lucide-react";
import type { BidPrediction } from "@/lib/api";

interface PredictionBadgeProps {
  prediction: BidPrediction | null | undefined;
  isLoading?: boolean;
  size?: "sm" | "md";
  showLabel?: boolean;
  className?: string;
}

const RECOMENDACAO_CONFIG = {
  PARTICIPAR: {
    label: "Participar",
    color: "bg-muted text-foreground",
    border: "border-border",
    icon: TrendingUp,
    iconColor: "text-foreground",
  },
  ANALISAR: {
    label: "Analisar",
    color: "bg-muted text-muted-foreground",
    border: "border-border",
    icon: Minus,
    iconColor: "text-muted-foreground",
  },
  DESCARTAR: {
    label: "Descartar",
    color: "bg-destructive/10 text-destructive",
    border: "border-destructive/30",
    icon: TrendingDown,
    iconColor: "text-destructive",
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
          "border-border bg-muted text-muted-foreground",
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
          "border-border bg-muted text-muted-foreground",
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
    if (s >= 70) return "bg-foreground";
    if (s >= 40) return "bg-muted-foreground";
    return "bg-destructive";
  };

  return (
    <div className={cn("h-2 w-full rounded-full bg-muted", className)}>
      <div
        className={cn("h-2 rounded-full transition-all duration-500", getColor(score))}
        style={{ width: `${score}%` }}
      />
    </div>
  );
}
