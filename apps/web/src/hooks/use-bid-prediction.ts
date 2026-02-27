import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type BidPrediction } from "@/lib/api";

// ─────────────────────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Busca a análise preditiva mais recente de uma licitação (sem recalcular).
 * Retorna null se não houver análise prévia.
 */
export function useBidPrediction(bidId: string) {
  return useQuery<BidPrediction | null>({
    queryKey: ["bid-prediction", bidId],
    queryFn: async () => {
      const { data } = await api.get<BidPrediction | null>(
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

  return useMutation<BidPrediction, Error, string>({
    mutationFn: async (bidId: string) => {
      const { data } = await api.post<BidPrediction>(
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
