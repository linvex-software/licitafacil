export interface RelatorioResponseDto {
  periodo: {
    inicio: string;
    fim: string;
    label: string;
  };

  metricas: {
    total: number;
    ganhas: number;
    perdidas: number;
    emAndamento: number;
    taxaSucesso: number;
  };

  distribuicaoStatus: Array<{
    status: string;
    quantidade: number;
    percentual: number;
  }>;

  distribuicaoModalidade: Array<{
    modalidade: string;
    quantidade: number;
    percentual: number;
  }>;

  timeline: Array<{
    mes: string;
    total: number;
    ganhas: number;
    perdidas: number;
  }>;

  licitacoes: Array<{
    id: string;
    titulo: string;
    modalidade: string;
    orgao: string;
    status: string;
    dataCriacao: string;
  }>;
}
