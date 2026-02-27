import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PrismaTenantService } from "../prisma/prisma-tenant.service";
import { AiService } from "../ai/ai.service";
import { DocumentService } from "../document/document.service";
import { PdfParserUtil } from "../common/utils/pdf-parser.util";
import { type CreateBidInput, type UpdateBidInput, type Bid } from "@licitafacil/shared";
import type { AnalisarEditalResponseDto } from "./dto/analisar-edital.dto";

/**
 * Interface para filtros de listagem de licitações
 */
export interface ListBidsFilters {
  empresaId: string;
  modality?: string;
  legalStatus?: string;
  operationalState?: string;
  search?: string; // Busca por título ou órgão
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class BidService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly prismaTenant: PrismaTenantService,
    private readonly aiService: AiService,
    private readonly documentService: DocumentService,
  ) { }

  /**
   * Cria uma nova licitação
   */
  async create(data: CreateBidInput, empresaId: string): Promise<Bid> {
    const prismaWithTenant = this.prismaTenant.forTenant(empresaId);
    const bid = await prismaWithTenant.bid.create({
      data: {
        title: data.title,
        agency: data.agency,
        modality: data.modality,
        legalStatus: data.legalStatus,
        operationalState: data.operationalState,
        empresaId,
      },
    });

    return this.mapToBid(bid);
  }

  /**
   * Lista licitações com filtros e paginação
   */
  async findAll(filters: ListBidsFilters) {
    const prismaWithTenant = this.prismaTenant.forTenant(filters.empresaId);

    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100); // Máximo 100 por página
    const skip = (page - 1) * limit;

    // Construir filtros do Prisma
    const where: any = {
      empresaId: filters.empresaId,
    };

    if (filters.modality) {
      where.modality = filters.modality;
    }

    if (filters.legalStatus) {
      where.legalStatus = filters.legalStatus;
    }

    if (filters.operationalState) {
      where.operationalState = filters.operationalState;
    }

    // Busca por título ou órgão (case insensitive)
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { agency: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    // Filtro por período (data de criação)
    if (filters.startDate || filters.endDate) {
      where.createdAt = {
        ...(filters.startDate && { gte: new Date(filters.startDate) }),
        ...(filters.endDate && { lte: new Date(filters.endDate) }),
      };
    }

    // Buscar licitações e total
    const [bids, total] = await Promise.all([
      prismaWithTenant.bid.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      prismaWithTenant.bid.count({ where }),
    ]);

    return {
      data: bids.map((bid) => this.mapToBid(bid)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Busca uma licitação por ID (com filtro de tenant)
   */
  async findOne(id: string, empresaId: string): Promise<Bid> {
    const prismaWithTenant = this.prismaTenant.forTenant(empresaId);
    const bid = await prismaWithTenant.bid.findUnique({
      where: { id },
    });

    if (!bid) {
      throw new NotFoundException(`Licitação com ID ${id} não encontrada`);
    }

    return this.mapToBid(bid);
  }

  /**
   * Atualiza uma licitação
   */
  async update(id: string, data: UpdateBidInput, empresaId: string): Promise<Bid> {
    const prismaWithTenant = this.prismaTenant.forTenant(empresaId);

    // Verificar se a licitação existe
    const existingBid = await prismaWithTenant.bid.findUnique({
      where: { id },
    });

    if (!existingBid) {
      throw new NotFoundException(`Licitação com ID ${id} não encontrada`);
    }

    // Atualizar apenas campos fornecidos
    const updatedBid = await prismaWithTenant.bid.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.agency && { agency: data.agency }),
        ...(data.modality && { modality: data.modality }),
        ...(data.legalStatus && { legalStatus: data.legalStatus }),
        ...(data.operationalState && { operationalState: data.operationalState }),
      },
    });

    return this.mapToBid(updatedBid);
  }

  /**
   * Move uma licitação entre as colunas do Funil Kanban atualizando seu legalStatus
   * e registrando uma auditoria da mudança de coluna
   */
  async moverColuna(id: string, empresaId: string, userId: string, targetColumn: string): Promise<Bid> {
    const prismaWithTenant = this.prismaTenant.forTenant(empresaId);

    const existingBid = await prismaWithTenant.bid.findUnique({
      where: { id },
    });

    if (!existingBid) {
      throw new NotFoundException(`Licitação com ID ${id} não encontrada`);
    }

    if (existingBid.legalStatus === targetColumn) {
      return this.mapToBid(existingBid);
    }

    const previousColumn = existingBid.legalStatus;

    // Utilize Prisma transaction for atomicity: Update status + Audit Log
    const [updatedBid] = await prismaWithTenant.$transaction([
      prismaWithTenant.bid.update({
        where: { id },
        data: { legalStatus: targetColumn },
      }),
      prismaWithTenant.auditLog.create({
        data: {
          empresaId,
          userId,
          action: "bid.funil.moved",
          resourceType: "Bid",
          resourceId: id,
          metadata: {
            from: previousColumn,
            to: targetColumn,
          },
        },
      }),
    ]);

    return this.mapToBid(updatedBid);
  }

  /**
   * Remove uma licitação (soft delete é feito via SoftDeleteService)
   * Este método não deve ser usado diretamente
   */
  async remove(id: string, empresaId: string): Promise<void> {
    const prismaWithTenant = this.prismaTenant.forTenant(empresaId);

    const bid = await prismaWithTenant.bid.findUnique({
      where: { id },
    });

    if (!bid) {
      throw new NotFoundException(`Licitação com ID ${id} não encontrada`);
    }

    // Soft delete é feito via SoftDeleteService
    // Este método apenas valida que a licitação existe
  }

  /**
   * Mapeia entidade Prisma para Bid
   */
  private mapToBid(bid: {
    id: string;
    empresaId: string;
    title: string;
    agency: string;
    modality: string;
    legalStatus: string;
    operationalState: string;
    riskReason: string | null;
    lastRiskAnalysisAt: Date | null;
    manualRiskOverride: boolean;
    manualRiskOverrideBy: string | null;
    manualRiskOverrideAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): Bid {
    return {
      id: bid.id,
      empresaId: bid.empresaId,
      title: bid.title,
      agency: bid.agency,
      modality: bid.modality,
      legalStatus: bid.legalStatus,
      operationalState: bid.operationalState,
      riskReason: bid.riskReason,
      lastRiskAnalysisAt: bid.lastRiskAnalysisAt?.toISOString() ?? null,
      manualRiskOverride: bid.manualRiskOverride,
      manualRiskOverrideBy: bid.manualRiskOverrideBy,
      manualRiskOverrideAt: bid.manualRiskOverrideAt?.toISOString() ?? null,
      createdAt: bid.createdAt.toISOString(),
      updatedAt: bid.updatedAt.toISOString(),
    };
  }

  /**
   * Busca licitações por modalidade
   */
  async findByModality(modality: string, empresaId: string): Promise<Bid[]> {
    return (await this.findAll({ empresaId, modality, page: 1, limit: 100 })).data;
  }

  /**
   * Busca licitações por status jurídico
   */
  async findByLegalStatus(legalStatus: string, empresaId: string): Promise<Bid[]> {
    return (await this.findAll({ empresaId, legalStatus, page: 1, limit: 100 })).data;
  }

  /**
   * Busca licitações por estado operacional
   */
  async findByOperationalState(operationalState: string, empresaId: string): Promise<Bid[]> {
    return (await this.findAll({ empresaId, operationalState, page: 1, limit: 100 })).data;
  }

  /**
   * Conta total de licitações da empresa
   */
  async count(empresaId: string): Promise<number> {
    const prismaWithTenant = this.prismaTenant.forTenant(empresaId);
    return prismaWithTenant.bid.count();
  }

  /**
   * Retorna informações de uso mensal de licitações da empresa.
   * Plano único high-ticket — sem restrições de limite.
   */
  async obterLimite(empresaId: string) {
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const licitacoesNoMes = await this.prisma.bid.count({
      where: {
        empresaId,
        deletedAt: null,
        createdAt: { gte: inicioMes },
      },
    });

    return {
      atual: licitacoesNoMes,
      limite: 999999,
      disponivel: 999999,
      percentual: 0,
    };
  }

  /**
   * Analisa edital de licitação com IA (GPT-4o)
   */
  async analisarEdital(
    bidId: string,
    empresaId: string,
    pdf: Express.Multer.File,
  ): Promise<AnalisarEditalResponseDto> {
    // Verificar se licitação existe e pertence à empresa
    await this.findOne(bidId, empresaId);

    // Validar tamanho
    PdfParserUtil.validarTamanho(pdf.buffer, 50);

    // Extrair texto
    const texto = await PdfParserUtil.extrairTexto(pdf.buffer);

    // Analisar com IA
    const resultado = await this.aiService.analisarEdital(
      texto,
      bidId,
      empresaId,
    );

    return resultado;
  }

  async chatComEdital(bidId: string, pergunta: string, empresaId: string) {
    const prismaWithTenant = this.prismaTenant.forTenant(empresaId);

    await this.findOne(bidId, empresaId);

    const editalAnalise = await prismaWithTenant.editalAnalise.findFirst({
      where: { bidId },
      orderBy: { createdAt: "desc" },
    });

    if (
      !editalAnalise ||
      editalAnalise.status !== "CONCLUIDA" ||
      !editalAnalise.resultado
    ) {
      throw new BadRequestException("ANALISE_NAO_ENCONTRADA");
    }

    const analiseJson = JSON.stringify(editalAnalise.resultado);
    const resposta = await this.aiService.chatComEdital(analiseJson, pergunta);

    const chat = await prismaWithTenant.chatHistorico.create({
      data: {
        empresaId,
        bidId,
        pergunta,
        resposta,
      },
    });

    return {
      resposta: chat.resposta,
      pergunta: chat.pergunta,
      createdAt: chat.createdAt,
    };
  }

  async getChatHistorico(bidId: string, empresaId: string) {
    const prismaWithTenant = this.prismaTenant.forTenant(empresaId);

    await this.findOne(bidId, empresaId);

    const editalAnalise = await prismaWithTenant.editalAnalise.findFirst({
      where: { bidId },
      orderBy: { createdAt: "desc" },
    });

    if (
      !editalAnalise ||
      editalAnalise.status !== "CONCLUIDA" ||
      !editalAnalise.resultado
    ) {
      throw new BadRequestException("ANALISE_NAO_ENCONTRADA");
    }

    const historicoDesc = await prismaWithTenant.chatHistorico.findMany({
      where: { bidId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return historicoDesc.reverse();
  }
  /**
   * Importa requisitos de documentação gerados pela IA e cria Documentos PENDENTES.
   */
  async importarDocumentosAnalise(
    bidId: string,
    empresaId: string,
    userId: string,
  ) {
    // 1. Verificar se licitação existe
    await this.findOne(bidId, empresaId);

    // 2. Buscar última análise concluída
    const prismaWithTenant = this.prismaTenant.forTenant(empresaId);
    const analise = await prismaWithTenant.editalAnalise.findFirst({
      where: { bidId, status: "CONCLUIDA" },
      orderBy: { createdAt: "desc" },
    });

    if (!analise || !analise.resultado) {
      throw new BadRequestException("Nenhuma análise de edital concluída encontrada para esta licitação");
    }

    const resultado = analise.resultado as any;
    const documentos = resultado.documentos || [];

    if (documentos.length === 0) {
      return { criados: 0, documentos: [] };
    }

    const criados = [];
    for (const doc of documentos) {
      // Infere a categoria do documento (ex: Certidão, Balanço)
      const category = this.inferirCategoriaDocumento(doc.nome || "");

      const novoDoc = await this.documentService.createPendente(
        doc.nome,
        category,
        bidId,
        empresaId,
        userId,
      );
      criados.push(novoDoc);
    }

    return { criados: criados.length, documentos: criados };
  }

  /**
   * Gera a lista de Checklist baseada nas etapas/tarefas extraídas pela AI
   */
  async gerarChecklistAnalise(
    bidId: string,
    empresaId: string,
    _userId: string,
  ) {
    await this.findOne(bidId, empresaId);

    const prismaWithTenant = this.prismaTenant.forTenant(empresaId);
    const analise = await prismaWithTenant.editalAnalise.findFirst({
      where: { bidId, status: "CONCLUIDA" },
      orderBy: { createdAt: "desc" },
    });

    if (!analise || !analise.resultado) {
      throw new BadRequestException("Nenhuma análise de edital concluída encontrada para esta licitação");
    }

    const resultado = analise.resultado as any;
    let etapas = resultado.etapas || [];

    if (etapas.length === 0) {
      const prazos = resultado.prazos || [];
      const documentos = resultado.documentos || [];

      etapas = [
        ...prazos.map((p: any) => ({
          nome: `Prazo: ${p.tipo}`,
          descricao: `Data: ${p.data}. ${p.descricao || ""}`
        })),
        ...documentos.map((d: any) => ({
          nome: `Providenciar: ${d.nome}`,
          descricao: d.obrigatorio ? "Documento Obrigatório" : "Documento Opcional"
        }))
      ];
    }

    if (etapas.length === 0) {
      return { criados: 0, itens: [] };
    }

    const itensCriados = [];
    for (const etapa of etapas) {
      const isCritical = etapa.nome?.toLowerCase().includes("vencimento") ||
        etapa.nome?.toLowerCase().includes("prazo") ||
        etapa.nome?.toLowerCase().includes("obrigatório");

      const newItem = await prismaWithTenant.checklistItem.create({
        data: {
          empresaId,
          licitacaoId: bidId,
          titulo: etapa.nome,
          descricao: etapa.descricao || "",
          category: "OUTROS", // TODO: Melhorar no futuro com machine learning se necessário
          exigeEvidencia: false,
          isCritical: !!isCritical,
        }
      });
      itensCriados.push(newItem);
    }

    return { criados: itensCriados.length, itens: itensCriados };
  }

  private inferirCategoriaDocumento(nomeDocumento: string): string {
    const n = nomeDocumento.toLowerCase();
    if (n.includes("certidão") || n.includes("certidao") || n.includes("cnd")) return "CERTIDOES";
    if (n.includes("contrato") || n.includes("social")) return "CONTRATOS";
    if (n.includes("certificado") || n.includes("iso") || n.includes("qualidade")) return "CERTIFICADOS";
    if (n.includes("licença") || n.includes("licenca") || n.includes("alvará") || n.includes("alvara")) return "LICENCAS";
    if (n.includes("proposta") || n.includes("preço") || n.includes("preco")) return "PROPOSTAS";
    if (n.includes("habilitação") || n.includes("habilitacao") || n.includes("cnpj") || n.includes("balanço")) return "HABILITACAO";
    if (n.includes("comprovante") || n.includes("declaração") || n.includes("declaracao")) return "COMPROVANTES";
    return "OUTROS";
  }
}
