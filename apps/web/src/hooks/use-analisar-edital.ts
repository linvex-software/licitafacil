"use client";

import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface AnalisarEditalParams {
  bidId: string;
  pdf: File;
}

export interface AnalisarEditalResponse {
  modalidade: string;
  numero: string;
  objeto: string;
  valorEstimado: number | null;
  prazos: Array<{
    tipo: string;
    data: string;
    descricao: string;
  }>;
  documentos: Array<{
    nome: string;
    obrigatorio: boolean;
  }>;
  tokensUsados?: number;
  tempoSegundos?: number;
}

export function useAnalisarEdital() {
  const { toast } = useToast();

  return useMutation<AnalisarEditalResponse, Error, AnalisarEditalParams>({
    mutationFn: async ({ bidId, pdf }) => {
      const formData = new FormData();
      formData.append("pdf", pdf);

      const response = await api.post(
        `/bids/${bidId}/analisar-edital`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          timeout: 90000, // 90 segundos
        },
      );

      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "Análise concluída",
        description: "O edital foi analisado com sucesso pela IA.",
      });
    },
    onError: (error: any) => {
      const mensagem =
        error.response?.data?.message ||
        "Erro ao analisar edital. Tente novamente.";

      toast({
        title: "Erro na análise",
        description: mensagem,
        variant: "destructive",
      });
    },
  });
}
