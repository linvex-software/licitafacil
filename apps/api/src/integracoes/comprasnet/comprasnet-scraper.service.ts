import { Injectable, Logger } from "@nestjs/common";

export interface ResultadoBusca {
  numero: string;
  orgao: string;
  objeto: string;
  dataLimite: string | null;
  linkEdital: string | null;
  uasg: string;
  modalidade: string;
}

export interface FiltrosBusca {
  /** CNPJ do órgão (14 dígitos, sem pontuação). Principal filtro para busca no PNCP. */
  cnpj?: string;
  /** Código UASG (legado ComprasNet). Mantido para compatibilidade. */
  uasg?: string;
  /** Código da modalidade (6=Pregão Eletrônico, 4=Concorrência Eletrônica, 8=Dispensa) */
  modalidade?: string;
  /** UF para filtro regional (ex: SP, RJ, MG) */
  uf?: string;
  /** Código do município IBGE */
  codigoMunicipio?: string;
  /** Data início (YYYY-MM-DD) */
  dataInicio?: string;
  /** Data fim (YYYY-MM-DD) */
  dataFim?: string;
  /** Palavras-chave para filtrar no objeto (separar por vírgula) */
  keywords?: string;
}

/** Mapeamento de modalidade legível -> código PNCP */
const MODALIDADE_MAP: Record<string, number> = {
  PREGAO_ELETRONICO: 6,
  PREGAO_PRESENCIAL: 7,
  CONCORRENCIA_ELETRONICA: 4,
  CONCORRENCIA_PRESENCIAL: 5,
  DISPENSA: 8,
  INEXIGIBILIDADE: 9,
  LEILAO_ELETRONICO: 1,
  CREDENCIAMENTO: 12,
  TODAS: 0,
};

/** Mapeamento reverso: código -> nome legível */
const MODALIDADE_NOME: Record<number, string> = {
  1: "Leilão Eletrônico",
  2: "Diálogo Competitivo",
  3: "Concurso",
  4: "Concorrência Eletrônica",
  5: "Concorrência Presencial",
  6: "Pregão Eletrônico",
  7: "Pregão Presencial",
  8: "Dispensa de Licitação",
  9: "Inexigibilidade",
  12: "Credenciamento",
  13: "Leilão Presencial",
};

@Injectable()
export class ComprasnetScraperService {
  private readonly logger = new Logger(ComprasnetScraperService.name);

  private readonly BASE_URL = "https://pncp.gov.br/api/consulta/v1";

  /**
   * Busca licitações no PNCP (Portal Nacional de Contratações Públicas).
   *
   * - Se CNPJ fornecido: usa endpoint /publicacao (mais completo)
   * - Caso contrário: usa endpoint /proposta (propostas abertas)
   */
  async buscarLicitacoes(filtros: FiltrosBusca): Promise<ResultadoBusca[]> {
    this.logger.log(
      `Buscando licitações via API PNCP - CNPJ: ${filtros.cnpj || "N/A"}, UF: ${filtros.uf || "N/A"}`,
    );

    // Calcular datas (formato YYYYMMDD para o PNCP)
    const hoje = new Date();
    const dataFim = filtros.dataFim || hoje.toISOString().split("T")[0];
    const dataInicio =
      filtros.dataInicio ||
      (() => {
        const d = new Date();
        d.setDate(d.getDate() - 90); // padrão: últimos 90 dias
        return d.toISOString().split("T")[0];
      })();

    const dataInicioFmt = dataInicio.replace(/-/g, "");
    const dataFimFmt = dataFim.replace(/-/g, "");

    // Determinar código de modalidade
    const codigoModalidade = this.resolverCodigoModalidade(filtros.modalidade);

    // Escolher estratégia de busca
    if (filtros.cnpj?.trim()) {
      return this.buscarPorPublicacao(
        filtros,
        dataInicioFmt,
        dataFimFmt,
        codigoModalidade,
      );
    }

    return this.buscarPorProposta(
      filtros,
      dataInicioFmt,
      dataFimFmt,
      codigoModalidade,
    );
  }

  /**
   * Busca por publicação (requer CNPJ do órgão).
   * Retorna licitações publicadas por um órgão específico.
   */
  private async buscarPorPublicacao(
    filtros: FiltrosBusca,
    dataInicio: string,
    dataFim: string,
    codigoModalidade: number,
  ): Promise<ResultadoBusca[]> {
    const resultados: ResultadoBusca[] = [];
    let pagina = 1;
    const tamanhoPagina = 50;

    while (resultados.length < 200) {
      try {
        const params = new URLSearchParams({
          dataInicial: dataInicio,
          dataFinal: dataFim,
          cnpj: filtros.cnpj!.replace(/\D/g, ""),
          pagina: pagina.toString(),
          tamanhoPagina: tamanhoPagina.toString(),
        });

        if (codigoModalidade > 0) {
          params.set(
            "codigoModalidadeContratacao",
            codigoModalidade.toString(),
          );
        }

        const url = `${this.BASE_URL}/contratacoes/publicacao?${params}`;
        this.logger.log(`API PNCP /publicacao (página ${pagina}): ${url}`);

        const response = await this.fetchComRetry(url);
        if (!response.ok) {
          const errorBody = await response.text();
          this.logger.warn(
            `API PNCP retornou ${response.status}: ${errorBody}`,
          );
          break;
        }

        const data = await response.json();
        if (!data?.data || data.data.length === 0) break;

        for (const item of data.data) {
          resultados.push(this.mapearItem(item, filtros));
        }

        this.logger.log(
          `Página ${pagina}: ${data.data.length} itens (total acumulado: ${resultados.length})`,
        );

        if (data.data.length < tamanhoPagina) break;
        pagina++;

        // Rate limit
        await new Promise((r) => setTimeout(r, 800));
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.error(`Erro na página ${pagina}: ${msg}`);
        break;
      }
    }

    return this.aplicarFiltroKeywords(resultados, filtros.keywords);
  }

  /**
   * Busca por propostas abertas (não requer CNPJ).
   * Permite filtro por UF, município e modalidade.
   */
  private async buscarPorProposta(
    filtros: FiltrosBusca,
    dataInicio: string,
    dataFim: string,
    codigoModalidade: number,
  ): Promise<ResultadoBusca[]> {
    const resultados: ResultadoBusca[] = [];
    let pagina = 1;
    const tamanhoPagina = 50;

    // Se não tem nem CNPJ nem UF, forçar uma modalidade para não puxar tudo
    const modalidadeEfetiva =
      codigoModalidade > 0 ? codigoModalidade : 6; // default Pregão Eletrônico

    while (resultados.length < 200) {
      try {
        const params = new URLSearchParams({
          dataInicial: dataInicio,
          dataFinal: dataFim,
          codigoModalidadeContratacao: modalidadeEfetiva.toString(),
          pagina: pagina.toString(),
          tamanhoPagina: tamanhoPagina.toString(),
        });

        if (filtros.uf?.trim()) {
          params.set("uf", filtros.uf.trim().toUpperCase());
        }

        if (filtros.codigoMunicipio?.trim()) {
          params.set("codigoMunicipioIbge", filtros.codigoMunicipio.trim());
        }

        const url = `${this.BASE_URL}/contratacoes/proposta?${params}`;
        this.logger.log(`API PNCP /proposta (página ${pagina}): ${url}`);

        const response = await this.fetchComRetry(url);
        if (!response.ok) {
          const errorBody = await response.text();
          this.logger.warn(
            `API PNCP retornou ${response.status}: ${errorBody}`,
          );
          break;
        }

        const data = await response.json();
        if (!data?.data || data.data.length === 0) break;

        for (const item of data.data) {
          resultados.push(this.mapearItem(item, filtros));
        }

        this.logger.log(
          `Página ${pagina}: ${data.data.length} itens (total acumulado: ${resultados.length})`,
        );

        if (data.data.length < tamanhoPagina) break;
        pagina++;

        // Rate limit
        await new Promise((r) => setTimeout(r, 800));
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.error(`Erro na página ${pagina}: ${msg}`);
        break;
      }
    }

    return this.aplicarFiltroKeywords(resultados, filtros.keywords);
  }

  /**
   * Mapeia item da API do PNCP para nosso formato ResultadoBusca.
   */
  private mapearItem(item: any, filtros: FiltrosBusca): ResultadoBusca {
    const cnpjOrgao = item.orgaoEntidade?.cnpj || "";
    const anoCompra = item.anoCompra || "";
    const seqCompra = item.sequencialCompra || "";

    // Montar link do edital no PNCP
    const linkPncp =
      cnpjOrgao && anoCompra && seqCompra
        ? `https://pncp.gov.br/app/editais/${cnpjOrgao}/${anoCompra}/${seqCompra}`
        : null;

    return {
      numero:
        item.numeroCompra ||
        item.numeroControlePNCP ||
        `${seqCompra}/${anoCompra}`,
      orgao:
        item.orgaoEntidade?.razaoSocial ||
        item.unidadeOrgao?.nomeUnidade ||
        filtros.cnpj ||
        "Órgão não informado",
      objeto: (item.objetoCompra || item.descricaoCompra || "Objeto não informado")
        .replace(/\[Portal de Compras Públicas\]\s*-?\s*/gi, "")
        .replace(/\[PNCP\]\s*-?\s*/gi, "")
        .trim()
        .substring(0, 500),
      dataLimite:
        this.formatarData(item.dataEncerramentoProposta) ||
        this.formatarData(item.dataAberturaProposta) ||
        null,
      linkEdital: item.linkSistemaOrigem || linkPncp,
      uasg:
        item.unidadeOrgao?.codigoUnidade ||
        filtros.uasg ||
        filtros.cnpj ||
        "",
      modalidade:
        MODALIDADE_NOME[item.modalidadeId] ||
        item.modalidadeNome ||
        "PREGAO_ELETRONICO",
    };
  }

  /**
   * Formata data ISO para dd/mm/yyyy.
   */
  private formatarData(dataIso: string | null | undefined): string | null {
    if (!dataIso) return null;
    try {
      const d = new Date(dataIso);
      if (isNaN(d.getTime())) return null;
      return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
    } catch {
      return null;
    }
  }

  /**
   * Resolve código de modalidade a partir de string legível ou número.
   */
  private resolverCodigoModalidade(modalidade?: string): number {
    if (!modalidade || modalidade === "TODAS") return 0;

    // Se já é número, usar direto
    const num = parseInt(modalidade);
    if (!isNaN(num)) return num;

    // Tentar mapear nome -> código
    return MODALIDADE_MAP[modalidade.toUpperCase()] || 0;
  }

  /**
   * Aplica filtro de palavras-chave nos resultados.
   */
  private aplicarFiltroKeywords(
    resultados: ResultadoBusca[],
    keywords?: string,
  ): ResultadoBusca[] {
    if (!keywords?.trim()) return resultados;

    const termos = keywords
      .toLowerCase()
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    const filtrados = resultados.filter((r) =>
      termos.some(
        (k) =>
          r.objeto.toLowerCase().includes(k) ||
          r.orgao.toLowerCase().includes(k),
      ),
    );

    this.logger.log(
      `Filtro keywords [${termos.join(", ")}]: ${filtrados.length}/${resultados.length}`,
    );
    return filtrados;
  }

  /**
   * Fetch com retry e backoff exponencial.
   */
  private async fetchComRetry(
    url: string,
    tentativas = 3,
    delayBase = 2000,
  ): Promise<Response> {
    for (let i = 0; i < tentativas; i++) {
      try {
        const response = await fetch(url, {
          headers: {
            Accept: "application/json",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
          },
          signal: AbortSignal.timeout(20000),
        });
        return response;
      } catch (error) {
        if (i === tentativas - 1) throw error;
        const backoff = delayBase * Math.pow(2, i);
        this.logger.warn(
          `Tentativa ${i + 1}/${tentativas} falhou. Aguardando ${backoff}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, backoff));
      }
    }
    throw new Error("Todas as tentativas falharam");
  }
}
