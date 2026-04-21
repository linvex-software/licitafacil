"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Factor {
  nome: string;
  score: number;
  peso: number;
  detalhe?: string;
}

interface PredictiveAnalysisProps {
  score: number;
  factors: Factor[];
  processTitle: string;
}

const BENCHMARK_BY_MODALIDADE: Record<string, number> = {
  PREGAO_ELETRONICO: 48,
  "PREGAO ELETRONICO": 48,
  DISPENSA: 62,
  CONCORRENCIA: 45,
  DEFAULT: 52,
};

function getScoreColor(score: number): string {
  if (score >= 70) return "text-foreground";
  if (score >= 40) return "text-muted-foreground";
  return "text-destructive";
}

function getScoreBarColor(score: number): string {
  if (score >= 70) return "bg-foreground";
  if (score >= 40) return "bg-muted-foreground";
  return "bg-destructive";
}

function getContextMessage(score: number): { text: string; color: string } {
  if (score >= 70) {
    return {
      text: "Boa oportunidade — os fatores principais estão favoráveis.",
      color: "text-foreground",
    };
  }
  if (score >= 45) {
    return {
      text: "Score mediano — há fatores que você pode melhorar antes de participar.",
      color: "text-muted-foreground",
    };
  }
  return {
    text: "Atenção necessária — analise os fatores críticos antes de decidir.",
    color: "text-destructive",
  };
}

export function PredictiveAnalysis({ score, factors, processTitle }: PredictiveAnalysisProps) {
  const message = getContextMessage(score);
  const benchmark = BENCHMARK_BY_MODALIDADE.DEFAULT;

  return (
    <section className="mb-6 rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            Análise Preditiva de Sucesso
            <span className="ml-2 rounded border border-border bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
              Beta
            </span>
          </h3>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{processTitle}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="mb-1 text-xs text-muted-foreground">
            Baseado nos dados disponíveis até o momento
          </p>
          <p className={`text-2xl font-black tabular-nums ${getScoreColor(score)}`}>{score}</p>
          <p className="text-xs text-muted-foreground">/100</p>
          <p className={`mt-1 text-xs ${message.color}`}>{message.text}</p>
        </div>
      </div>

      <div className="mb-5 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-all duration-1000", getScoreBarColor(score))}
            style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
          />
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">{score}/100</span>
      </div>

      <div className="mb-4 rounded-lg border border-border bg-muted/50 px-4 py-3">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="mb-0.5 text-xs text-muted-foreground">Seu score</p>
            <p className="text-lg font-bold text-foreground">{score}</p>
          </div>

          <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="absolute inset-y-0 left-[40%] w-[25%] bg-border opacity-60" />
            <div
              className={cn("absolute inset-y-0 left-0 rounded-full transition-all duration-700", getScoreBarColor(score))}
              style={{ width: `${score}%` }}
            />
            <div className="absolute inset-y-0 left-[52%] w-0.5 bg-border" />
          </div>

          <div className="text-center">
            <p className="mb-0.5 text-xs text-muted-foreground">Média mercado</p>
            <p className="text-lg font-bold text-muted-foreground">{benchmark}</p>
          </div>
        </div>
      </div>

      {score >= benchmark ? (
        <p className="mb-4 text-xs text-foreground">
          ↑ Acima da média para licitações desta modalidade
        </p>
      ) : (
        <p className="mb-4 text-xs text-muted-foreground">
          Próximo da média — melhore os fatores críticos para aumentar as chances
        </p>
      )}

      <div className="space-y-3">
        {factors.map((factor) => {
          const detalhe = factor.detalhe ?? "Fator avaliado pela IA.";
          const isNeutral = factor.score === 50 && detalhe.toLowerCase().includes("neutro");
          return (
            <div key={`${factor.nome}-${factor.peso}`} className="rounded-lg border border-border p-3">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-foreground">{factor.nome}</span>
                <span className={`text-xs font-bold tabular-nums ${isNeutral ? "text-muted-foreground" : getScoreColor(factor.score)}`}>
                  {factor.score}/100
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted">
                <div
                  className={`h-1.5 rounded-full transition-all ${getScoreBarColor(factor.score)}`}
                  style={{ width: `${Math.max(0, Math.min(100, factor.score))}%` }}
                />
              </div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  {detalhe}
                  {isNeutral ? (
                    <span className="ml-1 text-muted-foreground" title="dado insuficiente, não penaliza">
                      ⓘ
                    </span>
                  ) : null}
                </span>
                <span className="text-xs text-muted-foreground">{Math.round(factor.peso * 100)}%</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-start gap-2 border-t border-border pt-4">
        <span className="mt-0.5 text-xs">✦</span>
        <p className="text-xs leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">LicitaAI</span>{" "}
          pode cometer erros. Os scores são estimativas baseadas nos dados disponíveis — sempre valide com o edital original antes de tomar decisões.
        </p>
      </div>
    </section>
  );
}
