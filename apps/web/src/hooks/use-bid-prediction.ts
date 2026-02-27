import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

export interface FatorAnalise {
  nome: string;
  descricao: string;
  peso: number;
  score: number;
  scoreContribuicao: number;
  detalhe: string;
  dados?: Record<string, any>;
}

export interface BidPredictionResult {
  id: string;
  bidId: string;
  empresaId: string;
  score: number;
  recomendacao: "PARTICIPAR" | "ANALISAR" | "DESCARTAR";
  fatores: FatorAnalise[];
  explicacao: string;
  acoes: string[];
  tokensUsados?: number;
  tempoSegundos?: number;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Busca a análise preditiva mais recente de uma licitação (sem recalcular).
 * Retorna null se não houver análise prévia.
 */
export function useBidPrediction(bidId: string) {
  return useQuery<BidPredictionResult | null>({
    queryKey: ["bid-prediction", bidId],
    queryFn: async () => {
      const { data } = await api.get<BidPredictionResult | null>(
        `/bids/${bidId}/probabilidade`,
      );
      return data;
    },
    enabled: !!bidId,
    staleTime: 1000 * 60 * 5, // 5 minutos de cache
  });
}

/**
 * Dispara nova análise preditiva (recalcula todos os 6 fatores).
 * Persiste o resultado no banco e invalida o cache.
 */
export function useAnalisarProbabilidade() {
  const queryClient = useQueryClient();

  return useMutation<BidPredictionResult, Error, string>({
    mutationFn: async (bidId: string) => {
      const { data } = await api.post<BidPredictionResult>(
        `/bids/${bidId}/analisar-probabilidade`,
      );
      return data;
    },
    onSuccess: (data) => {
      // Atualiza o cache com o novo resultado
      queryClient.setQueryData(["bid-prediction", data.bidId], data);
    },
  });
}
