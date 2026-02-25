import { Injectable, Logger } from "@nestjs/common";

type HistoricoCompraItem = {
  data: string;
  objeto: string;
  vencedor: string;
  valor: number;
  modalidade: string;
  numeroContrato: string;
};

type HistoricoPorMes = {
  mes: string;
  valorTotal: number;
};

type HistoricoResponse = {
  itens: HistoricoCompraItem[];
  porMes: HistoricoPorMes[];
  mensagem?: string;
};

type ConcorrenteResponse = {
  taxaSucesso: number;
  totalVencidas: number;
  valorTotalGanho: number;
  modalidades: { modalidade: string; quantidade: number }[];
  licitacoes: { data: string; objeto: string; orgao: string; valor: number }[];
  mensagem?: string;
};

type ProdutoResponse = {
  produto: string;
  marca: string;
  vezesHomologado: number;
  precoMedio: number;
  precoMinimo: number;
  precoMaximo: number;
};

@Injectable()
export class AnaliseService {
  private readonly logger = new Logger(AnaliseService.name);
  private readonly BASE_URL = "https://pncp.gov.br/api/consulta/v1";

  async analisarHistoricoOrgao(
    cnpjOrgao: string,
    meses: number,
  ): Promise<HistoricoResponse> {
    const cnpj = this.normalizeCnpj(cnpjOrgao);
    const { dataInicial, dataFinal } = this.getDateRangeMonths(meses);

    try {
      const contratos = await this.fetchPaginated<any>("/contratos", {
        dataInicial,
        dataFinal,
        cnpjOrgao: cnpj,
      });

      const filtrados = contratos.filter(
        (item) => this.normalizeCnpj(item?.orgaoEntidade?.cnpj || "") === cnpj,
      );

      const itens = filtrados.map((item) => {
        const valor = this.toNumber(item?.valorGlobal ?? item?.valorInicial ?? 0);
        return {
          data: this.toIsoDate(item?.dataAssinatura || item?.dataPublicacaoPncp),
          objeto: item?.objetoContrato || "Objeto não informado",
          vencedor: item?.nomeRazaoSocialFornecedor || "Não informado",
          valor,
          modalidade: item?.categoriaProcesso?.nome || "Não informado",
          numeroContrato: item?.numeroContratoEmpenho || item?.numeroControlePNCP || "N/A",
        };
      });

      const porMesMap = new Map<string, number>();
      for (const item of itens) {
        const chaveMes = this.toMonthKey(item.data);
        porMesMap.set(chaveMes, (porMesMap.get(chaveMes) || 0) + item.valor);
      }

      const porMes = Array.from(porMesMap.entries())
        .map(([mes, valorTotal]) => ({ mes, valorTotal }))
        .sort((a, b) => (a.mes > b.mes ? 1 : -1));

      return { itens, porMes };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`PNCP indisponível em analisarHistoricoOrgao: ${msg}`);
      return {
        itens: [],
        porMes: [],
        mensagem: "Não foi possível consultar o PNCP no momento. Tente novamente em instantes.",
      };
    }
  }

  async analisarConcorrente(cnpjEmpresa: string): Promise<ConcorrenteResponse> {
    const cnpj = this.normalizeCnpj(cnpjEmpresa);
    const { dataInicial, dataFinal } = this.getDateRangeMonths(12);

    try {
      // O PNCP é inconsistente: alguns ambientes aceitam cnpjFornecedor, outros niFornecedor.
      // Também pode ocorrer timeout/erro 500 em uma variação e sucesso na outra.
      let contratos: any[] = [];

      try {
        contratos = await this.fetchPaginated<any>(
          "/contratos",
          {
            dataInicial,
            dataFinal,
            cnpjFornecedor: cnpj,
          },
          2,
          20,
        );
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Fallback de concorrentes: cnpjFornecedor falhou (${msg})`);
      }

      if (contratos.length === 0) {
        try {
          contratos = await this.fetchPaginated<any>(
            "/contratos",
            {
              dataInicial,
              dataFinal,
              niFornecedor: cnpj,
            },
            2,
            20,
          );
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          this.logger.warn(`Fallback de concorrentes: niFornecedor falhou (${msg})`);
        }
      }

      const vencidas = contratos.filter(
        (item) => this.normalizeCnpj(item?.niFornecedor || "") === cnpj,
      );

      const valorTotalGanho = vencidas.reduce(
        (acc, item) => acc + this.toNumber(item?.valorGlobal ?? item?.valorInicial ?? 0),
        0,
      );

      const modalidadesMap = new Map<string, number>();
      for (const item of vencidas) {
        const modalidade = item?.categoriaProcesso?.nome || "Não informado";
        modalidadesMap.set(modalidade, (modalidadesMap.get(modalidade) || 0) + 1);
      }

      const modalidades = Array.from(modalidadesMap.entries())
        .map(([modalidade, quantidade]) => ({ modalidade, quantidade }))
        .sort((a, b) => b.quantidade - a.quantidade);

      const licitacoes = vencidas.map((item) => ({
        data: this.toIsoDate(item?.dataAssinatura || item?.dataPublicacaoPncp),
        objeto: item?.objetoContrato || "Objeto não informado",
        orgao: item?.orgaoEntidade?.razaoSocial || "Órgão não informado",
        valor: this.toNumber(item?.valorGlobal ?? item?.valorInicial ?? 0),
      }));

      // A API pública não expõe participações de forma direta.
      // Neste cenário, taxa de sucesso fica 100% quando há vitórias registradas.
      const taxaSucesso = vencidas.length > 0 ? 100 : 0;

      return {
        taxaSucesso,
        totalVencidas: vencidas.length,
        valorTotalGanho,
        modalidades,
        licitacoes,
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`PNCP indisponível em analisarConcorrente: ${msg}`);
      return {
        taxaSucesso: 0,
        totalVencidas: 0,
        valorTotalGanho: 0,
        modalidades: [],
        licitacoes: [],
        mensagem: "Não foi possível consultar o PNCP no momento. Tente novamente em instantes.",
      };
    }
  }

  async analisarProdutos(categoria: string): Promise<{ itens: ProdutoResponse[]; mensagem?: string }> {
    const termo = categoria.trim().toLowerCase();
    const { dataInicial, dataFinal } = this.getDateRangeMonths(12);

    try {
      // Tenta primeiro filtro por descrição diretamente no PNCP.
      let contratos = await this.fetchPaginated<any>(
        "/contratos",
        {
          dataInicial,
          dataFinal,
          descricao: termo,
        },
        2,
        20,
      );

      let filtrados = contratos.filter((item) => {
        const objeto = String(item?.objetoContrato || "").toLowerCase();
        return objeto.includes(termo);
      });

      // Fallback: alguns ambientes ignoram "descricao". Busca genérica e filtra localmente.
      if (filtrados.length === 0) {
        contratos = await this.fetchPaginated<any>(
          "/contratos",
          {
            dataInicial,
            dataFinal,
          },
          5,
          50,
        );

        filtrados = contratos.filter((item) => {
          const objeto = String(item?.objetoContrato || "").toLowerCase();
          return objeto.includes(termo);
        });
      }

      const agrupado = new Map<
        string,
        { produto: string; marca: string; valores: number[]; vezesHomologado: number }
      >();

      for (const item of filtrados) {
        const produto = this.extractProduto(item?.objetoContrato || "");
        const marca = item?.nomeRazaoSocialFornecedor || "Não informado";
        const valor = this.toNumber(item?.valorGlobal ?? item?.valorInicial ?? 0);
        const chave = `${produto}::${marca}`;

        const atual = agrupado.get(chave);
        if (atual) {
          atual.vezesHomologado += 1;
          atual.valores.push(valor);
        } else {
          agrupado.set(chave, {
            produto,
            marca,
            vezesHomologado: 1,
            valores: [valor],
          });
        }
      }

      const itens: ProdutoResponse[] = Array.from(agrupado.values())
        .map((item) => {
          const valoresValidos = item.valores.filter((v) => Number.isFinite(v) && v > 0);
          const soma = valoresValidos.reduce((acc, v) => acc + v, 0);
          const precoMedio = valoresValidos.length > 0 ? soma / valoresValidos.length : 0;
          const precoMinimo = valoresValidos.length > 0 ? Math.min(...valoresValidos) : 0;
          const precoMaximo = valoresValidos.length > 0 ? Math.max(...valoresValidos) : 0;

          return {
            produto: item.produto,
            marca: item.marca,
            vezesHomologado: item.vezesHomologado,
            precoMedio,
            precoMinimo,
            precoMaximo,
          };
        })
        .sort((a, b) => b.vezesHomologado - a.vezesHomologado);

      return { itens };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`PNCP indisponível em analisarProdutos: ${msg}`);
      return {
        itens: [],
        mensagem: "Não foi possível consultar o PNCP no momento. Tente novamente em instantes.",
      };
    }
  }

  private async fetchPaginated<T>(
    endpoint: string,
    baseParams: Record<string, string>,
    maxPages = 5,
    pageSize = 50,
  ): Promise<T[]> {
    const all: T[] = [];

    for (let page = 1; page <= maxPages; page++) {
      const params = new URLSearchParams({
        ...baseParams,
        pagina: String(page),
        tamanhoPagina: String(pageSize),
      });

      const url = `${this.BASE_URL}${endpoint}?${params.toString()}`;
      const response = await this.fetchComRetry(url);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status} em ${endpoint}: ${errorText}`);
      }

      const body = await response.json();
      const data = Array.isArray(body?.data) ? (body.data as T[]) : [];
      all.push(...data);

      if (data.length < pageSize) {
        break;
      }
    }

    return all;
  }

  private async fetchComRetry(url: string, tentativas = 3): Promise<Response> {
    for (let i = 0; i < tentativas; i++) {
      try {
        return await fetch(url, {
          headers: {
            Accept: "application/json",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
          },
          signal: AbortSignal.timeout(45000),
        });
      } catch (error) {
        if (i === tentativas - 1) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 1500 * (i + 1)));
      }
    }

    throw new Error("Todas as tentativas de consulta ao PNCP falharam");
  }

  private getDateRangeMonths(meses: number) {
    const hoje = new Date();
    const inicio = new Date(hoje);
    inicio.setMonth(hoje.getMonth() - meses);

    return {
      dataInicial: this.toPncpDate(inicio),
      dataFinal: this.toPncpDate(hoje),
    };
  }

  private normalizeCnpj(cnpj: string): string {
    return (cnpj || "").replace(/\D/g, "");
  }

  private toPncpDate(date: Date): string {
    return date.toISOString().slice(0, 10).replace(/-/g, "");
  }

  private toIsoDate(value: unknown): string {
    if (typeof value !== "string" || !value) {
      return new Date().toISOString();
    }
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }

  private toMonthKey(isoDate: string): string {
    const d = new Date(isoDate);
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${month}/${d.getFullYear()}`;
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private extractProduto(objeto: string): string {
    const normalized = String(objeto || "")
      .replace(/\s+/g, " ")
      .trim();

    if (!normalized) {
      return "Produto não informado";
    }

    const [firstPart] = normalized.split(/[.;:-]/);
    return firstPart.slice(0, 120);
  }
}
