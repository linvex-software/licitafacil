"use client";

import { Sparkles } from "lucide-react";

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
  if (score >= 70) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 40) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function getScoreBarColor(score: number): string {
  if (score >= 70) return "bg-emerald-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-red-500";
}

function getContextMessage(score: number): { text: string; color: string } {
  if (score >= 70) {
    return {
      text: "Boa oportunidade — os fatores principais estão favoráveis.",
      color: "text-emerald-500",
    };
  }
  if (score >= 45) {
    return {
      text: "Score mediano — há fatores que você pode melhorar antes de participar.",
      color: "text-amber-500",
    };
  }
  return {
    text: "Atenção necessária — analise os fatores críticos antes de decidir.",
    color: "text-red-400",
  };
}

export function PredictiveAnalysis({ score, factors, processTitle }: PredictiveAnalysisProps) {
  const message = getContextMessage(score);
  const benchmark = BENCHMARK_BY_MODALIDADE.DEFAULT;

  return (
    <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-gray-100">
            <Sparkles className="h-4 w-4 text-purple-500" />
            Análise Preditiva de Sucesso
            <span className="ml-2 text-xs font-medium px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
              Beta
            </span>
          </h3>
          <p className="mt-1 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">{processTitle}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="mb-1 text-xs text-gray-400 dark:text-gray-500">
            Baseado nos dados disponíveis até o momento
          </p>
          <p className={`text-2xl font-black tabular-nums ${getScoreColor(score)}`}>{score}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">/100</p>
          <p className={`mt-1 text-xs ${message.color}`}>{message.text}</p>
        </div>
      </div>

      <div className="mb-5 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${Math.max(0, Math.min(100, score))}%`,
              background: score >= 70 ? "#22c55e" : score >= 45 ? "#f59e0b" : "#ef4444",
            }}
          />
        </div>
        <span className="shrink-0 text-xs text-gray-400">{score}/100</span>
      </div>

      <div className="mb-4 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/50">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="mb-0.5 text-xs text-gray-400">Seu score</p>
            <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{score}</p>
          </div>

          <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div className="absolute inset-y-0 left-[40%] w-[25%] bg-gray-300 opacity-50 dark:bg-gray-600" />
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
              style={{
                width: `${score}%`,
                background: score >= 70 ? "#22c55e" : score >= 45 ? "#f59e0b" : "#ef4444",
              }}
            />
            <div className="absolute inset-y-0 left-[52%] w-0.5 bg-gray-400 dark:bg-gray-500" />
          </div>

          <div className="text-center">
            <p className="mb-0.5 text-xs text-gray-400">Média mercado</p>
            <p className="text-lg font-bold text-gray-500">{benchmark}</p>
          </div>
        </div>
      </div>

      {score >= benchmark ? (
        <p className="mb-4 text-xs text-emerald-500 dark:text-emerald-400">
          ↑ Acima da média para licitações desta modalidade
        </p>
      ) : (
        <p className="mb-4 text-xs text-amber-500">
          Próximo da média — melhore os fatores críticos para aumentar as chances
        </p>
      )}

      <div className="space-y-3">
        {factors.map((factor) => {
          const detalhe = factor.detalhe ?? "Fator avaliado pela IA.";
          const isNeutral = factor.score === 50 && detalhe.toLowerCase().includes("neutro");
          return (
            <div key={`${factor.nome}-${factor.peso}`} className="rounded-lg border border-gray-100 p-3 dark:border-gray-800">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{factor.nome}</span>
                <span className={`text-xs font-bold tabular-nums ${isNeutral ? "text-gray-400" : getScoreColor(factor.score)}`}>
                  {factor.score}/100
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  className={`h-1.5 rounded-full transition-all ${getScoreBarColor(factor.score)}`}
                  style={{ width: `${Math.max(0, Math.min(100, factor.score))}%` }}
                />
              </div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {detalhe}
                  {isNeutral ? (
                    <span className="ml-1 text-gray-400" title="dado insuficiente, não penaliza">
                      ⓘ
                    </span>
                  ) : null}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">{Math.round(factor.peso * 100)}%</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-start gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
        <span className="mt-0.5 text-xs">✦</span>
        <p className="text-xs leading-relaxed text-gray-400 dark:text-gray-500">
          <span className="font-semibold text-gray-500 dark:text-gray-400">LicitaAI</span>{" "}
          pode cometer erros. Os scores são estimativas baseadas nos dados disponíveis — sempre valide com o edital original antes de tomar decisões.
        </p>
      </div>
    </section>
  );
}
