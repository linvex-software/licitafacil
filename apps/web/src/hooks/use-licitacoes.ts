import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Bid, PaginatedResponse } from "@licitafacil/shared";

export type LicitacaoStatus = 'aberta' | 'em_analise' | 'encerrada' | 'vencida' | 'EM_ANDAMENTO' | 'EM_RISCO' | 'CONCLUIDA' | 'CANCELADA';

// Mapping local statuses to API operationalState
const statusMap: Record<string, string> = {
    'aberta': 'OK', // Changed from EM_ANDAMENTO to OK to match OperationalState
    'em_analise': 'OK',
    'encerrada': 'OK',
    'vencida': 'EM_RISCO',
};

export function useLicitacoes(filters: any = {}) {
    return useQuery({
        queryKey: ["licitacoes", filters],
        queryFn: async () => {
            const mappedOperationalState = filters.operationalState
                ? filters.operationalState
                : filters.status
                    ? statusMap[filters.status]
                    : undefined;
            const mappedLegalStatus = filters.status === "ENCERRANDO"
                ? "ENCERRANDO"
                : filters.legalStatus;

            const { data } = await api.get("/bids", {
                params: {
                    page: filters.page || 1,
                    limit: filters.limit || 20,
                    search: filters.search,
                    modality: filters.modality,
                    operationalState: mappedOperationalState,
                    legalStatus: mappedLegalStatus,
                },
            });

            // Map API structure to PaginatedResponse<Bid>
            return {
                data: data.data,
                total: data.pagination.total,
                page: data.pagination.page,
                pageSize: data.pagination.limit,
                totalPages: data.pagination.totalPages,
            } as PaginatedResponse<Bid>;
        },
    });
}

export function useLicitacao(id: string) {
    return useQuery({
        queryKey: ["licitacoes", id],
        queryFn: async () => {
            const { data } = await api.get<Bid>(`/bids/${id}`);
            return data;
        },
        enabled: !!id,
    });
}

export function useCreateBid() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (newBid: Partial<Bid>) => {
            const { data } = await api.post<Bid>("/bids", newBid);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["licitacoes"] });
        },
    });
}

export function useUpdateBid() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data: updateData }: { id: string; data: Partial<Bid> }) => {
            const { data } = await api.patch<Bid>(`/bids/${id}`, updateData);
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["licitacoes"] });
            queryClient.invalidateQueries({ queryKey: ["licitacoes", data.id] });
        },
    });
}

export function useBidStats() {
    return useQuery({
        queryKey: ["bid-stats"],
        queryFn: async () => {
            const { data } = await api.get<{ total: number }>("/bids/stats/count");
            return data;
        },
    });
}

export interface BidLimite {
    atual: number;
    limite: number;
    disponivel: number;
    percentual: number;
}

export function useBidLimite() {
    return useQuery({
        queryKey: ["bid-limite"],
        queryFn: async () => {
            const { data } = await api.get<BidLimite>("/bids/limite");
            return data;
        },
    });
}

export interface BidOverviewStats {
    total: number;
    emAndamento: number;
    emRisco: number;
    analisando: number;
    vencidas: number;
    encerrandoEmBreve: number;
}

export function useBidOverviewStats() {
    return useQuery({
        queryKey: ["bid-overview-stats"],
        queryFn: async () => {
            const { data } = await api.get<BidOverviewStats>("/bids/stats/overview");
            return data;
        },
    });
}
