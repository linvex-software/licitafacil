import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import OpenAI from "openai";
import { PrismaService } from "../prisma/prisma.service";
import { PrismaTenantService } from "../prisma/prisma-tenant.service";

// ─────────────────────────────────────────────────────────────────────────────
// Interfaces públicas
// ─────────────────────────────────────────────────────────────────────────────

export interface FatorAnalise {
  nome: string;
  descricao: string;
  peso: number;          // 0-1 (ex: 0.25 = 25%)
  score: number;         // 0-100
  scoreContribuicao: number; // score * peso
  detalhe: string;       // Explicação textual do score
  dados?: Record<string, any>; // Dados brutos usados no cálculo
}

export interface BidPredictionResult {
  id: string;
  bidId: string;
  empresaId: string;
  score: number;                // 0-100 (score final ponderado)
  recomendacao: "PARTICIPAR" | "ANALISAR" | "DESCARTAR";
  fatores: FatorAnalise[];
  explicacao: string;           // Parágrafo gerado pela IA
  acoes: string[];              // Lista de ações recomendadas
  tokensUsados?: number;
  tempoSegundos?: number;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pesos dos fatores (devem somar 1.0)
// ─────────────────────────────────────────────────────────────────────────────
const PESOS = {
  HISTORICO_ORGAO:       0.25,
  DOCUMENTACAO:          0.20,
  PRAZO_ADEQUADO:        0.15,
  VALOR_ESTIMADO:        0.15,
  CONCORRENCIA:          0.15,
  COMPLEXIDADE_OBJETO:   0.10,
} as const;

@Injectable()
export class BidPredictionService {
  private readonly logger = new Logger(BidPredictionService.name);
  private openai: OpenAI;

  constructor(
    private readonly prisma: PrismaService,
    private readonly prismaTenant: PrismaTenantService,
  ) {
    const apiKey = process.env.OPENAI_API_KEY;
    this.openai = new OpenAI({ apiKey: apiKey || "" });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Endpoint principal: analisa e persiste a predição
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Executa análise preditiva completa de uma licitação.
   * Calcula 6 fatores, gera score final e persiste no banco.
   */
  async analisarProbabilidade(
    bidId: string,
    empresaId: string,
  ): Promise<BidPredictionResult> {
    const inicio = Date.now();
    this.logger.log(`Iniciando análise preditiva para bid ${bidId}`);

    const prismaWithTenant = this.prismaTenant.forTenant(empresaId);

    // 1. Buscar licitação
    const bid = await prismaWithTenant.bid.findUnique({ where: { id: bidId } });
    if (!bid) {
      throw new NotFoundException(`Licitação com ID ${bidId} não encontrada`);
    }

    // 2. Calcular os 6 fatores em paralelo (exceto complexidade que usa IA)
    const [
      fatorHistorico,
      fatorDocumentacao,
      fatorPrazo,
      fatorValor,
      fatorConcorrencia,
    ] = await Promise.all([
      this.calcularHistoricoOrgao(bid, empresaId),
      this.calcularDocumentacao(bidId, empresaId),
      this.calcularPrazoAdequado(bidId, empresaId),
      this.calcularValorEstimado(bidId),
      this.calcularConcorrencia(bid.modality),
    ]);

    // 3. Calcular complexidade com IA (pode ser mais lento)
    const fatorComplexidade = await this.calcularComplexidadeObjeto(bid.title, bid.agency);

    const fatores: FatorAnalise[] = [
      fatorHistorico,
      fatorDocumentacao,
      fatorPrazo,
      fatorValor,
      fatorConcorrencia,
      fatorComplexidade,
    ];

    // 4. Calcular score final ponderado
    const scoreFinal = Math.round(
      fatores.reduce((acc, f) => acc + f.scoreContribuicao, 0),
    );

    // 5. Determinar recomendação
    const recomendacao = this.determinarRecomendacao(scoreFinal);

    // 6. Gerar explicação e ações com IA
    const { explicacao, acoes, tokensUsados } = await this.gerarExplicacaoIA(
      bid,
      fatores,
      scoreFinal,
      recomendacao,
    );

    const tempoSegundos = Math.floor((Date.now() - inicio) / 1000);

    // 7. Persistir resultado (upsert: uma predição por licitação, sempre a mais recente)
    const saved = await this.prisma.bidPrediction.upsert({
      where: {
        // Usamos um índice único composto (bidId) — sempre sobrescreve a última
        // Como não temos unique no schema, usamos findFirst + create/update
        id: await this.getExistingPredictionId(bidId),
      },
      update: {
        score: scoreFinal,
        recomendacao,
        fatores: fatores as any,
        explicacao,
        acoes: acoes as any,
        tokensUsados,
        tempoSegundos,
        updatedAt: new Date(),
      },
      create: {
        bidId,
        empresaId,
        score: scoreFinal,
        recomendacao,
        fatores: fatores as any,
        explicacao,
        acoes: acoes as any,
        tokensUsados,
        tempoSegundos,
      },
    });

    this.logger.log(
      `Análise preditiva concluída: score=${scoreFinal}, recomendacao=${recomendacao}, tempo=${tempoSegundos}s`,
    );

    return this.mapToResult(saved);
  }

  /**
   * Busca a predição mais recente de uma licitação (sem recalcular).
   * Retorna null se não houver predição.
   */
  async obterPrediction(
    bidId: string,
    empresaId: string,
  ): Promise<BidPredictionResult | null> {
    const prediction = await this.prisma.bidPrediction.findFirst({
      where: { bidId, empresaId },
      orderBy: { createdAt: "desc" },
    });

    if (!prediction) return null;
    return this.mapToResult(prediction);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Fator 1: Histórico no Órgão (peso: 25%)
  // ───────────────────────────────────────────────────────────────────────────

  private async calcularHistoricoOrgao(
    bid: any,
    empresaId: string,
  ): Promise<FatorAnalise> {
    const nome = "Histórico no Órgão";
    const peso = PESOS.HISTORICO_ORGAO;

    try {
      // Buscar todas as licitações finalizadas do mesmo órgão
      const licitacoesOrgao = await this.prisma.bid.findMany({
        where: {
          empresaId,
          agency: bid.agency,
          deletedAt: null,
          legalStatus: { in: ["VENCIDA", "PERDIDA", "Vencida", "Perdida"] },
        },
        select: { legalStatus: true },
      });

      const total = licitacoesOrgao.length;

      if (total === 0) {
        return {
          nome,
          descricao: "Histórico de vitórias no mesmo órgão licitante",
          peso,
          score: 50,
          scoreContribuicao: Math.round(50 * peso),
          detalhe: "Sem histórico neste órgão. Score neutro aplicado.",
          dados: { total: 0, vencidas: 0, perdidas: 0 },
        };
      }

      const vencidas = licitacoesOrgao.filter((l) =>
        ["VENCIDA", "Vencida"].includes(l.legalStatus),
      ).length;

      const taxaVitoria = (vencidas / total) * 100;
      const score = Math.round(taxaVitoria);

      let detalhe: string;
      if (taxaVitoria >= 70) {
        detalhe = `Excelente histórico: ${vencidas}/${total} vitórias (${score}%) neste órgão.`;
      } else if (taxaVitoria >= 40) {
        detalhe = `Histórico moderado: ${vencidas}/${total} vitórias (${score}%) neste órgão.`;
      } else {
        detalhe = `Histórico fraco: ${vencidas}/${total} vitórias (${score}%) neste órgão.`;
      }

      return {
        nome,
        descricao: "Histórico de vitórias no mesmo órgão licitante",
        peso,
        score,
        scoreContribuicao: Math.round(score * peso),
        detalhe,
        dados: { total, vencidas, perdidas: total - vencidas, taxaVitoria },
      };
    } catch (error) {
      this.logger.warn(`Erro ao calcular histórico do órgão: ${error}`);
      return this.fatorNeutro(nome, "Histórico de vitórias no mesmo órgão licitante", peso);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Fator 2: Documentação Completa (peso: 20%)
  // ───────────────────────────────────────────────────────────────────────────

  private async calcularDocumentacao(
    bidId: string,
    empresaId: string,
  ): Promise<FatorAnalise> {
    const nome = "Documentação Completa";
    const peso = PESOS.DOCUMENTACAO;

    try {
      const items = await this.prisma.checklistItem.findMany({
        where: { licitacaoId: bidId, empresaId, deletedAt: null },
        select: { concluido: true, isCritical: true },
      });

      if (items.length === 0) {
        return {
          nome,
          descricao: "Percentual de itens do checklist concluídos",
          peso,
          score: 50,
          scoreContribuicao: Math.round(50 * peso),
          detalhe: "Checklist não configurado. Score neutro aplicado.",
          dados: { total: 0, concluidos: 0, percentual: 0 },
        };
      }

      const total = items.length;
      const concluidos = items.filter((i) => i.concluido).length;
      const criticos = items.filter((i) => i.isCritical).length;
      const criticosConcluidos = items.filter((i) => i.isCritical && i.concluido).length;

      // Score base: % de itens concluídos
      const percentualBase = (concluidos / total) * 100;

      // Penalidade por itens críticos pendentes
      const criticosPendentes = criticos - criticosConcluidos;
      const penalidade = criticosPendentes * 10; // -10 pontos por crítico pendente

      const score = Math.max(0, Math.min(100, Math.round(percentualBase - penalidade)));

      let detalhe: string;
      if (score >= 80) {
        detalhe = `Documentação em dia: ${concluidos}/${total} itens concluídos.`;
      } else if (score >= 50) {
        detalhe = `Documentação parcial: ${concluidos}/${total} itens. ${criticosPendentes} crítico(s) pendente(s).`;
      } else {
        detalhe = `Documentação crítica: apenas ${concluidos}/${total} itens. ${criticosPendentes} crítico(s) pendente(s).`;
      }

      return {
        nome,
        descricao: "Percentual de itens do checklist concluídos",
        peso,
        score,
        scoreContribuicao: Math.round(score * peso),
        detalhe,
        dados: { total, concluidos, criticos, criticosPendentes, percentualBase },
      };
    } catch (error) {
      this.logger.warn(`Erro ao calcular documentação: ${error}`);
      return this.fatorNeutro(nome, "Percentual de itens do checklist concluídos", peso);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Fator 3: Prazo Adequado (peso: 15%)
  // ───────────────────────────────────────────────────────────────────────────

  private async calcularPrazoAdequado(
    bidId: string,
    empresaId: string,
  ): Promise<FatorAnalise> {
    const nome = "Prazo Adequado";
    const peso = PESOS.PRAZO_ADEQUADO;

    try {
      // Buscar o prazo mais próximo (entrega de propostas ou abertura)
      const prazo = await this.prisma.prazo.findFirst({
        where: {
          bidId,
          empresaId,
          deletedAt: null,
          dataPrazo: { gte: new Date() },
        },
        orderBy: { dataPrazo: "asc" },
      });

      if (!prazo) {
        return {
          nome,
          descricao: "Tempo disponível para preparação da proposta",
          peso,
          score: 50,
          scoreContribuicao: Math.round(50 * peso),
          detalhe: "Nenhum prazo futuro cadastrado. Score neutro aplicado.",
          dados: { diasRestantes: null },
        };
      }

      const agora = new Date();
      const diasRestantes = Math.floor(
        (prazo.dataPrazo.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Score baseado em dias restantes
      let score: number;
      let detalhe: string;

      if (diasRestantes > 30) {
        score = 100;
        detalhe = `Prazo confortável: ${diasRestantes} dias restantes para "${prazo.titulo}".`;
      } else if (diasRestantes > 15) {
        score = 80;
        detalhe = `Prazo adequado: ${diasRestantes} dias restantes para "${prazo.titulo}".`;
      } else if (diasRestantes > 7) {
        score = 55;
        detalhe = `Prazo apertado: apenas ${diasRestantes} dias para "${prazo.titulo}". Atenção redobrada.`;
      } else if (diasRestantes > 3) {
        score = 30;
        detalhe = `Prazo crítico: ${diasRestantes} dias para "${prazo.titulo}". Risco alto de não preparar a tempo.`;
      } else {
        score = 10;
        detalhe = `Prazo urgente: apenas ${diasRestantes} dia(s) para "${prazo.titulo}". Muito arriscado.`;
      }

      return {
        nome,
        descricao: "Tempo disponível para preparação da proposta",
        peso,
        score,
        scoreContribuicao: Math.round(score * peso),
        detalhe,
        dados: { diasRestantes, prazoTitulo: prazo.titulo, dataPrazo: prazo.dataPrazo },
      };
    } catch (error) {
      this.logger.warn(`Erro ao calcular prazo: ${error}`);
      return this.fatorNeutro(nome, "Tempo disponível para preparação da proposta", peso);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Fator 4: Valor Estimado (peso: 15%)
  // ───────────────────────────────────────────────────────────────────────────

  private async calcularValorEstimado(bidId: string): Promise<FatorAnalise> {
    const nome = "Valor Estimado";
    const peso = PESOS.VALOR_ESTIMADO;

    try {
      // Buscar análise de edital mais recente com valor estimado
      const analise = await this.prisma.editalAnalise.findFirst({
        where: { bidId, status: "CONCLUIDA" },
        orderBy: { createdAt: "desc" },
      });

      if (!analise || !analise.resultado) {
        return {
          nome,
          descricao: "Adequação do valor estimado ao porte da empresa",
          peso,
          score: 50,
          scoreContribuicao: Math.round(50 * peso),
          detalhe: "Edital não analisado. Faça a análise do edital para melhorar este score.",
          dados: { valorEstimado: null },
        };
      }

      const resultado = analise.resultado as any;
      const valorEstimado = resultado?.valorEstimado;

      if (!valorEstimado || typeof valorEstimado !== "number") {
        return {
          nome,
          descricao: "Adequação do valor estimado ao porte da empresa",
          peso,
          score: 50,
          scoreContribuicao: Math.round(50 * peso),
          detalhe: "Valor estimado não identificado no edital.",
          dados: { valorEstimado: null },
        };
      }

      // Score baseado no valor (faixa ideal: R$ 50k - R$ 5M)
      let score: number;
      let detalhe: string;
      const valorFormatado = valorEstimado.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });

      if (valorEstimado < 10000) {
        score = 40;
        detalhe = `Valor baixo (${valorFormatado}). Margem de lucro reduzida.`;
      } else if (valorEstimado < 50000) {
        score = 65;
        detalhe = `Valor moderado (${valorFormatado}). Viável com boa margem.`;
      } else if (valorEstimado <= 5000000) {
        score = 90;
        detalhe = `Valor ideal (${valorFormatado}). Excelente oportunidade de negócio.`;
      } else if (valorEstimado <= 20000000) {
        score = 70;
        detalhe = `Valor alto (${valorFormatado}). Verifique capacidade de execução.`;
      } else {
        score = 45;
        detalhe = `Valor muito alto (${valorFormatado}). Pode exigir consórcio ou garantias especiais.`;
      }

      return {
        nome,
        descricao: "Adequação do valor estimado ao porte da empresa",
        peso,
        score,
        scoreContribuicao: Math.round(score * peso),
        detalhe,
        dados: { valorEstimado, valorFormatado },
      };
    } catch (error) {
      this.logger.warn(`Erro ao calcular valor estimado: ${error}`);
      return this.fatorNeutro(nome, "Adequação do valor estimado ao porte da empresa", peso);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Fator 5: Concorrência Estimada (peso: 15%)
  // ───────────────────────────────────────────────────────────────────────────

  private async calcularConcorrencia(modality: string): Promise<FatorAnalise> {
    const nome = "Concorrência Estimada";
    const peso = PESOS.CONCORRENCIA;

    // Score baseado na modalidade (quanto mais competitiva, menor o score)
    const modalidadeUpper = modality?.toUpperCase() || "";

    let score: number;
    let detalhe: string;
    let concorrentesEstimados: string;

    if (modalidadeUpper.includes("DISPENSA") || modalidadeUpper.includes("INEXIGIBILIDADE")) {
      score = 90;
      detalhe = "Dispensa/Inexigibilidade: concorrência mínima ou inexistente.";
      concorrentesEstimados = "1-3 empresas";
    } else if (modalidadeUpper.includes("CONVITE")) {
      score = 80;
      detalhe = "Convite: concorrência limitada (3-5 empresas convidadas).";
      concorrentesEstimados = "3-5 empresas";
    } else if (modalidadeUpper.includes("TOMADA") || modalidadeUpper.includes("CONCORRENCIA")) {
      score = 60;
      detalhe = "Concorrência/Tomada de Preços: competição moderada.";
      concorrentesEstimados = "5-15 empresas";
    } else if (modalidadeUpper.includes("PREGAO") && modalidadeUpper.includes("PRESENCIAL")) {
      score = 45;
      detalhe = "Pregão Presencial: alta competição regional.";
      concorrentesEstimados = "10-20 empresas";
    } else if (modalidadeUpper.includes("PREGAO")) {
      score = 30;
      detalhe = "Pregão Eletrônico: altíssima competição nacional. Preço é fator decisivo.";
      concorrentesEstimados = "15-50+ empresas";
    } else {
      score = 50;
      detalhe = `Modalidade "${modality}": concorrência estimada moderada.`;
      concorrentesEstimados = "Indeterminado";
    }

    return {
      nome,
      descricao: "Nível de concorrência estimado pela modalidade",
      peso,
      score,
      scoreContribuicao: Math.round(score * peso),
      detalhe,
      dados: { modalidade: modality, concorrentesEstimados },
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Fator 6: Complexidade do Objeto (peso: 10%) — usa GPT-4o
  // ───────────────────────────────────────────────────────────────────────────

  private async calcularComplexidadeObjeto(
    titulo: string,
    orgao: string,
  ): Promise<FatorAnalise> {
    const nome = "Complexidade do Objeto";
    const peso = PESOS.COMPLEXIDADE_OBJETO;

    if (!process.env.OPENAI_API_KEY) {
      return {
        nome,
        descricao: "Complexidade técnica do objeto licitado",
        peso,
        score: 50,
        scoreContribuicao: Math.round(50 * peso),
        detalhe: "IA não configurada. Score neutro aplicado.",
        dados: { titulo },
      };
    }

    try {
      const prompt = `Analise a complexidade técnica do objeto desta licitação pública brasileira e retorne um JSON:

Objeto: "${titulo}"
Órgão: "${orgao}"

Retorne APENAS este JSON (sem texto adicional):
{
  "score": <número de 0 a 100, onde 100=muito simples, 0=extremamente complexo>,
  "nivel": "SIMPLES | MODERADO | COMPLEXO | MUITO_COMPLEXO",
  "justificativa": "<1 frase explicando o nível de complexidade>"
}

Critérios:
- SIMPLES (80-100): materiais de escritório, limpeza, alimentação, itens padronizados
- MODERADO (50-79): equipamentos de TI, veículos, serviços administrativos
- COMPLEXO (20-49): obras, sistemas de software, equipamentos especializados
- MUITO_COMPLEXO (0-19): infraestrutura crítica, tecnologia de ponta, projetos de engenharia`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini", // Mais barato para análise simples
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 200,
        response_format: { type: "json_object" },
      });

      const resultado = JSON.parse(completion.choices[0].message.content || "{}");
      const score = Math.max(0, Math.min(100, resultado.score || 50));

      return {
        nome,
        descricao: "Complexidade técnica do objeto licitado",
        peso,
        score,
        scoreContribuicao: Math.round(score * peso),
        detalhe: resultado.justificativa || `Nível ${resultado.nivel}: score ${score}/100`,
        dados: { titulo, nivel: resultado.nivel, score },
      };
    } catch (error) {
      this.logger.warn(`Erro ao calcular complexidade com IA: ${error}`);
      return this.fatorNeutro(nome, "Complexidade técnica do objeto licitado", peso);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Geração de explicação e ações com GPT-4o
  // ───────────────────────────────────────────────────────────────────────────

  private async gerarExplicacaoIA(
    bid: any,
    fatores: FatorAnalise[],
    score: number,
    recomendacao: string,
  ): Promise<{ explicacao: string; acoes: string[]; tokensUsados: number }> {
    if (!process.env.OPENAI_API_KEY) {
      return {
        explicacao: this.gerarExplicacaoFallback(score, recomendacao, fatores),
        acoes: this.gerarAcoesFallback(fatores),
        tokensUsados: 0,
      };
    }

    try {
      const fatoresResumo = fatores
        .map((f) => `- ${f.nome} (${Math.round(f.peso * 100)}%): ${f.score}/100 — ${f.detalhe}`)
        .join("\n");

      const prompt = `Você é um consultor especialista em licitações públicas brasileiras.

Analise os dados abaixo e gere uma avaliação estratégica:

LICITAÇÃO: "${bid.title}"
ÓRGÃO: "${bid.agency}"
MODALIDADE: "${bid.modality}"
SCORE FINAL: ${score}/100
RECOMENDAÇÃO: ${recomendacao}

FATORES ANALISADOS:
${fatoresResumo}

Retorne APENAS este JSON:
{
  "explicacao": "<parágrafo de 2-3 frases explicando o score e a recomendação de forma clara e objetiva>",
  "acoes": [
    "<ação específica e acionável 1>",
    "<ação específica e acionável 2>",
    "<ação específica e acionável 3>"
  ]
}

REGRAS:
- Explicação: máximo 3 frases, linguagem clara para gestores não técnicos
- Ações: 3 ações concretas e específicas para melhorar as chances de sucesso
- Se recomendação for DESCARTAR, explique por que e sugira alternativas
- Se PARTICIPAR, destaque os pontos fortes
- Se ANALISAR, liste os pontos de atenção`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: "json_object" },
      });

      const resultado = JSON.parse(completion.choices[0].message.content || "{}");
      const tokensUsados = completion.usage?.total_tokens || 0;

      return {
        explicacao: resultado.explicacao || this.gerarExplicacaoFallback(score, recomendacao, fatores),
        acoes: Array.isArray(resultado.acoes) ? resultado.acoes : this.gerarAcoesFallback(fatores),
        tokensUsados,
      };
    } catch (error) {
      this.logger.warn(`Erro ao gerar explicação com IA: ${error}`);
      return {
        explicacao: this.gerarExplicacaoFallback(score, recomendacao, fatores),
        acoes: this.gerarAcoesFallback(fatores),
        tokensUsados: 0,
      };
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Helpers
  // ───────────────────────────────────────────────────────────────────────────

  private determinarRecomendacao(score: number): "PARTICIPAR" | "ANALISAR" | "DESCARTAR" {
    if (score >= 70) return "PARTICIPAR";
    if (score >= 40) return "ANALISAR";
    return "DESCARTAR";
  }

  private fatorNeutro(nome: string, descricao: string, peso: number): FatorAnalise {
    return {
      nome,
      descricao,
      peso,
      score: 50,
      scoreContribuicao: Math.round(50 * peso),
      detalhe: "Dados insuficientes. Score neutro (50) aplicado.",
    };
  }

  private gerarExplicacaoFallback(
    score: number,
    recomendacao: string,
    fatores: FatorAnalise[],
  ): string {
    const melhorFator = [...fatores].sort((a, b) => b.score - a.score)[0];
    const piorFator = [...fatores].sort((a, b) => a.score - b.score)[0];

    const recomendacaoTexto: Record<string, string> = {
      PARTICIPAR: "Recomendamos participar desta licitação.",
      ANALISAR: "Esta licitação requer análise cuidadosa antes de decidir participar.",
      DESCARTAR: "Não recomendamos participar desta licitação no momento.",
    };

    return `Score de ${score}/100. ${recomendacaoTexto[recomendacao] || ""} Ponto forte: ${melhorFator?.nome} (${melhorFator?.score}/100). Principal atenção: ${piorFator?.nome} (${piorFator?.score}/100).`;
  }

  private gerarAcoesFallback(fatores: FatorAnalise[]): string[] {
    const acoes: string[] = [];
    const fatoresOrdenados = [...fatores].sort((a, b) => a.score - b.score);

    for (const fator of fatoresOrdenados.slice(0, 3)) {
      if (fator.nome === "Documentação Completa" && fator.score < 80) {
        acoes.push("Complete os itens pendentes do checklist, priorizando os marcados como críticos.");
      } else if (fator.nome === "Prazo Adequado" && fator.score < 60) {
        acoes.push("Mobilize a equipe imediatamente — o prazo está apertado para preparar a proposta.");
      } else if (fator.nome === "Histórico no Órgão" && fator.score < 50) {
        acoes.push("Pesquise licitações anteriores deste órgão para entender o perfil de compras.");
      } else if (fator.nome === "Concorrência Estimada" && fator.score < 50) {
        acoes.push("Prepare uma proposta de preço competitiva — a concorrência nesta modalidade é alta.");
      } else if (fator.nome === "Valor Estimado" && fator.score < 60) {
        acoes.push("Analise a viabilidade financeira e a margem de lucro antes de participar.");
      } else {
        acoes.push(`Melhore o fator "${fator.nome}" para aumentar as chances de sucesso.`);
      }
    }

    if (acoes.length === 0) {
      acoes.push("Mantenha a documentação atualizada e os prazos monitorados.");
    }

    return acoes;
  }

  private async getExistingPredictionId(bidId: string): Promise<string> {
    const existing = await this.prisma.bidPrediction.findFirst({
      where: { bidId },
      select: { id: true },
      orderBy: { createdAt: "desc" },
    });
    // Retorna um ID inexistente para forçar o create no upsert
    return existing?.id ?? "non-existent-id-will-trigger-create";
  }

  private mapToResult(prediction: any): BidPredictionResult {
    return {
      id: prediction.id,
      bidId: prediction.bidId,
      empresaId: prediction.empresaId,
      score: prediction.score,
      recomendacao: prediction.recomendacao as "PARTICIPAR" | "ANALISAR" | "DESCARTAR",
      fatores: prediction.fatores as FatorAnalise[],
      explicacao: prediction.explicacao || "",
      acoes: (prediction.acoes as string[]) || [],
      tokensUsados: prediction.tokensUsados ?? undefined,
      tempoSegundos: prediction.tempoSegundos ?? undefined,
      createdAt: prediction.createdAt.toISOString(),
      updatedAt: prediction.updatedAt.toISOString(),
    };
  }
}
