export interface AnalisarEditalResponseDto {
  is_edital: boolean;
  motivo?: string;
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
