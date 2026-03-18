import {
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";

type OrgaoFrequente = {
  nome: string;
  quantidade: number;
  valorTotal: number;
};

type ContratoRecente = {
  id: string;
  orgao: string;
  objeto: string;
  valor: number;
  dataInicio: string;
  dataFim: string;
};

export type ConcorrentesAnalyticsResponse = {
  cnpj: string;
  razaoSocial: string;
  totalContratos: number;
  valorTotal: number;
  valorMedio: number;
  orgaosUnicos: number;
  orgaosFrequentes: OrgaoFrequente[];
  contratosRecentes: ContratoRecente[];
};

type CacheEntry = {
  data: ConcorrentesAnalyticsResponse;
  timestamp: number;
};

@Injectable()
export class AnaliseConcorrentesService {
  private readonly logger = new Logger(AnaliseConcorrentesService.name);
  private readonly BASE_URL = "https://pncp.gov.br/api/consulta/v1";
  private readonly CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora
  private readonly cache = new Map<string, CacheEntry>();

  async buscarConcorrente(cnpj: string): Promise<ConcorrentesAnalyticsResponse> {
    const cnpjLimpo = cnpj.replace(/\D/g, "");

    const cached = this.cache.get(cnpjLimpo);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      this.logger.log(`Cache hit para CNPJ ${cnpjLimpo}`);
      return cached.data;
    }

    const contratos = await this.fetchContratos(cnpjLimpo);

    if (contratos.length === 0) {
      throw new NotFoundException(
        `Nenhum contrato encontrado para o CNPJ ${cnpjLimpo}`,
      );
    }

    const result = this.processarContratos(cnpjLimpo, contratos);

    this.cache.set(cnpjLimpo, { data: result, timestamp: Date.now() });

    return result;
  }

  private async fetchContratos(cnpj: string): Promise<any[]> {
    const hoje = new Date();
    const umAnoAtras = new Date();
    umAnoAtras.setFullYear(hoje.getFullYear() - 1);
    const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");
    const dataInicial = fmt(umAnoAtras);
    const dataFinal = fmt(hoje);

    const params = new URLSearchParams({
      cnpjOrgao: cnpj,
      dataInicial,
      dataFinal,
      pagina: "1",
      tamanhoPagina: "100",
    });

    const url = `${this.BASE_URL}/contratos?${params.toString()}`;

    const response = await this.fetchComRetry(url);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText.slice(0, 200)}`);
    }

    const body = await response.json();
    return Array.isArray(body?.data) ? body.data : [];
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
      } catch (error: unknown) {
        if (i === tentativas - 1) throw error;
        await new Promise<void>((resolve) => setTimeout(resolve, 1500 * (i + 1)));
      }
    }
    throw new Error("Todas as tentativas de consulta ao PNCP falharam");
  }

  private processarContratos(
    cnpj: string,
    contratos: any[],
  ): ConcorrentesAnalyticsResponse {
    const razaoSocial =
      contratos[0]?.orgaoEntidade?.razaoSocial ||
      "Não informado";

    const valorTotal = contratos.reduce(
      (acc, c) => acc + this.toNumber(c?.valorGlobal ?? c?.valorInicial ?? 0),
      0,
    );

    const valorMedio = contratos.length > 0 ? valorTotal / contratos.length : 0;

    // Agrupa por fornecedor vencedor
    const fornecedoresMap = new Map<string, { quantidade: number; valorTotal: number }>();

    for (const c of contratos) {
      const nome = c?.nomeRazaoSocialFornecedor || "Fornecedor não informado";
      const valor = this.toNumber(c?.valorGlobal ?? c?.valorInicial ?? 0);
      const atual = fornecedoresMap.get(nome);

      if (atual) {
        atual.quantidade += 1;
        atual.valorTotal += valor;
      } else {
        fornecedoresMap.set(nome, { quantidade: 1, valorTotal: valor });
      }
    }

    const orgaosUnicos = fornecedoresMap.size;

    const orgaosFrequentes: OrgaoFrequente[] = Array.from(fornecedoresMap.entries())
      .map(([nome, dados]) => ({ nome, ...dados }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5);

    // Contratos recentes: ordena por dataVigenciaInicio desc, pega os 10 mais recentes
    const contratosOrdenados = [...contratos].sort((a, b) => {
      const da = this.toTimestamp(a?.dataVigenciaInicio ?? a?.dataAssinatura);
      const db = this.toTimestamp(b?.dataVigenciaInicio ?? b?.dataAssinatura);
      return db - da;
    });

    const contratosRecentes: ContratoRecente[] = contratosOrdenados
      .slice(0, 10)
      .map((c) => ({
        id: String(c?.numeroControlePNCP ?? c?.numeroContratoEmpenho ?? "N/A"),
        orgao: c?.nomeRazaoSocialFornecedor || "Fornecedor não informado",
        objeto: c?.objetoContrato || "Objeto não informado",
        valor: this.toNumber(c?.valorGlobal ?? c?.valorInicial ?? 0),
        dataInicio: this.toIsoDate(c?.dataVigenciaInicio ?? c?.dataAssinatura),
        dataFim: this.toIsoDate(c?.dataVigenciaFim),
      }));

    return {
      cnpj,
      razaoSocial,
      totalContratos: contratos.length,
      valorTotal,
      valorMedio,
      orgaosUnicos,
      orgaosFrequentes,
      contratosRecentes,
    };
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private toTimestamp(value: unknown): number {
    if (typeof value !== "string" || !value) return 0;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? 0 : d.getTime();
  }

  private toIsoDate(value: unknown): string {
    if (typeof value !== "string" || !value) return new Date().toISOString();
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }
}
