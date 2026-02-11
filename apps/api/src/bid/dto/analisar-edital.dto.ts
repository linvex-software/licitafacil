export interface AnalisarEditalResponseDto {
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
