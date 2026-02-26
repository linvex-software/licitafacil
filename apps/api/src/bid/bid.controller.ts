import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Req,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { BidService } from "./bid.service";
import { BidRiskService } from "./bid-risk.service";
import { DocumentService } from "../document/document.service";
import { SoftDeleteService } from "../common/services/soft-delete.service";
import { AuditLogService } from "../audit-log/audit-log.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { Tenant } from "../common/decorators/tenant.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Audit } from "../audit-log/decorators/audit.decorator";
import { AuditInterceptor } from "../audit-log/interceptors/audit.interceptor";
import {
  createBidSchema,
  updateBidSchema,
  markBidAtRiskSchema,
  clearBidRiskSchema,
  moverColunaBidSchema,
  type Bid,
  type User,
  UserRole,
} from "@licitafacil/shared";
import type { Request } from "express";
import { ChatPerguntaDto } from "./dto/chat-pergunta.dto";

interface AuthenticatedRequest extends Request {
  user?: {
    empresaId?: string;
  };
}

/**
 * Controller para gerenciar licitações
 * 
 * Todos os endpoints requerem autenticação e isolamento por tenant
 */
@Controller("bids")
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
export class BidController {
  constructor(
    private readonly bidService: BidService,
    private readonly bidRiskService: BidRiskService,
    private readonly documentService: DocumentService,
    private readonly softDeleteService: SoftDeleteService,
    private readonly auditLogService: AuditLogService,
  ) { }

  /**
   * Cria uma nova licitação
   * POST /bids
   * 
   * Permissão: ADMIN e COLABORADOR
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  @Audit({ action: "bid.create", resourceType: "Bid" })
  async create(
    @Body() body: unknown,
    @Tenant() empresaId: string,
    @CurrentUser() _user: User,
    @Req() _request: Request,
  ): Promise<Bid> {
    // Validar dados de entrada com Zod
    const result = createBidSchema.safeParse(body);

    if (!result.success) {
      throw new BadRequestException({
        message: "Dados inválidos",
        errors: result.error.errors,
      });
    }

    return this.bidService.create(result.data, empresaId);
  }

  /**
   * Lista licitações com filtros e paginação
   * GET /bids
   * 
   * Query params:
   * - page: número da página (default: 1)
   * - limit: itens por página (default: 20, max: 100)
   * - modality: filtrar por modalidade
   * - legalStatus: filtrar por status jurídico
   * - operationalState: filtrar por estado operacional
   * - search: buscar por título ou órgão
   * 
   * Permissão: ADMIN e COLABORADOR
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  async findAll(
    @Tenant() empresaId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("modality") modality?: string,
    @Query("legalStatus") legalStatus?: string,
    @Query("operationalState") operationalState?: string,
    @Query("search") search?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.bidService.findAll({
      empresaId,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      modality,
      legalStatus,
      operationalState,
      search,
      startDate,
      endDate,
    });
  }

  /**
   * Retorna informações de limite mensal de licitações
   * GET /bids/limite
   * 
   * Permissão: ADMIN e COLABORADOR
   */
  @Get("limite")
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  async obterLimite(@Tenant() empresaId: string) {
    return this.bidService.obterLimite(empresaId);
  }

  /**
   * Lista documentos vinculados a uma licitação
   * GET /bids/:id/documents
   * 
   * Retorna todos os documentos associados à licitação.
   * 
   * Query params:
   * - page: número da página (default: 1)
   * - limit: itens por página (default: 20, max: 100)
   * - category: filtrar por categoria
   * - search: buscar por nome
   * 
   * Permissão: ADMIN e COLABORADOR
   */
  @Get(":id/documents")
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  async getDocuments(
    @Param("id") id: string,
    @Tenant() empresaId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("category") category?: string,
    @Query("search") search?: string,
  ) {
    // Validar que a licitação existe e pertence ao tenant
    await this.bidService.findOne(id, empresaId);

    // Buscar documentos da licitação
    return this.documentService.findAll({
      empresaId,
      bidId: id,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      category,
      search,
    });
  }

  /**
   * Busca histórico de alterações de uma licitação
   * GET /bids/:id/history
   * 
   * Retorna todas as alterações (criação, edições, exclusões) feitas na licitação,
   * incluindo informações do usuário que realizou cada alteração.
   * 
   * Query params:
   * - page: número da página (default: 1)
   * - limit: itens por página (default: 20, max: 100)
   * 
   * Permissão: ADMIN e COLABORADOR
   */
  @Get(":id/history")
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  async getHistory(
    @Param("id") id: string,
    @Tenant() empresaId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    // Validar que a licitação existe e pertence ao tenant
    await this.bidService.findOne(id, empresaId);

    // Buscar histórico de alterações
    return this.auditLogService.getResourceHistory(
      id,
      "Bid",
      empresaId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  /**
   * Busca uma licitação específica por ID
   * GET /bids/:id
   * 
   * Permissão: ADMIN e COLABORADOR
   */
  @Get(":id")
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  async findOne(
    @Param("id") id: string,
    @Tenant() empresaId: string,
  ): Promise<Bid> {
    return this.bidService.findOne(id, empresaId);
  }

  /**
   * Atualiza uma licitação
   * PATCH /bids/:id
   * 
   * Permissão: ADMIN e COLABORADOR
   */
  @Patch(":id")
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  @Audit({ action: "bid.update", resourceType: "Bid", captureResourceId: true })
  async update(
    @Param("id") id: string,
    @Body() body: unknown,
    @Tenant() empresaId: string,
    @CurrentUser() _user: User,
    @Req() _request: Request,
  ): Promise<Bid> {
    // Validar dados de entrada com Zod
    const result = updateBidSchema.safeParse(body);

    if (!result.success) {
      throw new BadRequestException({
        message: "Dados inválidos",
        errors: result.error.errors,
      });
    }

    return this.bidService.update(id, result.data, empresaId);
  }

  /**
   * Move a licitação no funil Kanban
   * PATCH /bids/:id/mover-coluna
   * 
   * Permissão: ADMIN e COLABORADOR
   */
  @Patch(":id/mover-coluna")
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  async moverColuna(
    @Param("id") id: string,
    @Body() body: unknown,
    @Tenant() empresaId: string,
    @CurrentUser() user: User,
  ): Promise<Bid> {
    const result = moverColunaBidSchema.safeParse(body);

    if (!result.success) {
      throw new BadRequestException({
        message: "Dados inválidos: coluna não permitida",
        errors: result.error.errors,
      });
    }

    return this.bidService.moverColuna(id, empresaId, user.id, result.data.coluna);
  }

  /**
   * Remove uma licitação (soft delete)
   * DELETE /bids/:id
   * 
   * Permissão: ADMIN
   */
  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN)
  async remove(
    @Param("id") id: string,
    @Tenant() empresaId: string,
    @CurrentUser() user: User,
    @Req() request: Request,
  ) {
    // Validar que a licitação existe antes de deletar
    await this.bidService.remove(id, empresaId);

    // Fazer soft delete com auditoria
    await this.softDeleteService.delete("bid", id, empresaId, user.id, request);

    return {
      message: "Licitação deletada com sucesso",
      id,
    };
  }

  /**
   * Restaura uma licitação deletada
   * POST /bids/:id/restore
   * 
   * Permissão: ADMIN
   */
  @Post(":id/restore")
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN)
  async restore(
    @Param("id") id: string,
    @Tenant() empresaId: string,
    @CurrentUser() user: User,
    @Req() request: Request,
  ) {
    await this.softDeleteService.restore("bid", id, empresaId, user.id, request);

    return {
      message: "Licitação restaurada com sucesso",
      id,
    };
  }

  /**
   * Busca licitações por modalidade
   * GET /bids/by-modality/:modality
   * 
   * Permissão: ADMIN e COLABORADOR
   */
  @Get("by-modality/:modality")
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  async findByModality(
    @Param("modality") modality: string,
    @Tenant() empresaId: string,
  ): Promise<Bid[]> {
    return this.bidService.findByModality(modality, empresaId);
  }

  /**
   * Busca licitações por status jurídico
   * GET /bids/by-legal-status/:legalStatus
   * 
   * Permissão: ADMIN e COLABORADOR
   */
  @Get("by-legal-status/:legalStatus")
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  async findByLegalStatus(
    @Param("legalStatus") legalStatus: string,
    @Tenant() empresaId: string,
  ): Promise<Bid[]> {
    return this.bidService.findByLegalStatus(legalStatus, empresaId);
  }

  /**
   * Busca licitações por estado operacional
   * GET /bids/by-operational-state/:operationalState
   * 
   * Permissão: ADMIN e COLABORADOR
   */
  @Get("by-operational-state/:operationalState")
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  async findByOperationalState(
    @Param("operationalState") operationalState: string,
    @Tenant() empresaId: string,
  ): Promise<Bid[]> {
    return this.bidService.findByOperationalState(operationalState, empresaId);
  }

  /**
   * Conta total de licitações da empresa
   * GET /bids/stats/count
   * 
   * Permissão: ADMIN e COLABORADOR
   */
  @Get("stats/count")
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  async count(@Tenant() empresaId: string) {
    const total = await this.bidService.count(empresaId);
    return {
      total,
      empresaId,
    };
  }

  /**
   * Analisa o risco de uma licitação
   * GET /bids/:id/risk-analysis
   * 
   * Retorna análise detalhada de risco com base nos itens do checklist.
   * Identifica pendências críticas e sugere estado operacional.
   * 
   * Permissão: ADMIN e COLABORADOR
   */
  @Get(":id/risk-analysis")
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  async getRiskAnalysis(
    @Param("id") id: string,
    @Tenant() empresaId: string,
  ) {
    // Validar que a licitação existe
    await this.bidService.findOne(id, empresaId);

    // Executar análise de risco
    return this.bidRiskService.analyzeRisk(id, empresaId);
  }

  /**
   * Marca licitação como EM_RISCO manualmente (com confirmação consciente)
   * POST /bids/:id/mark-at-risk
   * 
   * Requer confirmação explícita do usuário.
   * Cria um override manual, impedindo atualizações automáticas até ser removido.
   * 
   * Body: {
   *   "confirmacao": "CONFIRMO_MARCAR_EM_RISCO",
   *   "motivo": "Justificativa do usuário..."
   * }
   * 
   * Permissão: ADMIN e COLABORADOR
   */
  @Post(":id/mark-at-risk")
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  @Audit({ action: "bid.manual_mark_at_risk", resourceType: "Bid", captureResourceId: true })
  async markAtRisk(
    @Param("id") id: string,
    @Body() body: unknown,
    @Tenant() empresaId: string,
    @CurrentUser() user: User,
    @Req() request: Request,
  ) {
    // Validar confirmação consciente
    const result = markBidAtRiskSchema.safeParse(body);

    if (!result.success) {
      throw new BadRequestException({
        message: "Dados inválidos",
        errors: result.error.errors,
      });
    }

    const analysis = await this.bidRiskService.markAtRisk(
      id,
      empresaId,
      user.id,
      result.data.motivo,
      request,
    );

    return {
      message: "Licitação marcada como EM_RISCO com sucesso",
      analysis,
    };
  }

  /**
   * Remove estado EM_RISCO manualmente (com confirmação consciente)
   * POST /bids/:id/clear-risk
   * 
   * Requer confirmação explícita do usuário.
   * Cria um override manual, impedindo atualizações automáticas até ser removido.
   * 
   * Body: {
   *   "confirmacao": "CONFIRMO_REMOVER_RISCO"
   * }
   * 
   * Permissão: ADMIN e COLABORADOR
   */
  @Post(":id/clear-risk")
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  @Audit({ action: "bid.manual_clear_risk", resourceType: "Bid", captureResourceId: true })
  async clearRisk(
    @Param("id") id: string,
    @Body() body: unknown,
    @Tenant() empresaId: string,
    @CurrentUser() user: User,
    @Req() request: Request,
  ) {
    // Validar confirmação consciente
    const result = clearBidRiskSchema.safeParse(body);

    if (!result.success) {
      throw new BadRequestException({
        message: "Dados inválidos",
        errors: result.error.errors,
      });
    }

    const analysis = await this.bidRiskService.clearRisk(id, empresaId, user.id, request);

    return {
      message: "Risco removido com sucesso",
      analysis,
    };
  }

  /**
   * Remove override manual e permite atualizações automáticas
   * POST /bids/:id/remove-manual-override
   * 
   * Remove o flag de override manual, permitindo que o sistema
   * volte a atualizar automaticamente o estado operacional.
   * Executa análise de risco imediatamente após remover o override.
   * 
   * Permissão: ADMIN e COLABORADOR
   */
  @Post(":id/remove-manual-override")
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  @Audit({ action: "bid.remove_manual_override", resourceType: "Bid", captureResourceId: true })
  async removeManualOverride(
    @Param("id") id: string,
    @Tenant() empresaId: string,
    @CurrentUser() user: User,
    @Req() request: Request,
  ) {
    const result = await this.bidRiskService.removeManualOverride(
      id,
      empresaId,
      user.id,
      request,
    );

    return {
      message: "Override manual removido com sucesso",
      updated: result.updated,
      analysis: result.analysis,
    };
  }

  /**
   * Analisa edital de licitação com IA (GPT-4o)
   * POST /bids/:id/analisar-edital
   *
   * Recebe um PDF do edital, extrai texto e envia para análise com IA.
   * Retorna JSON estruturado com modalidade, número, objeto, prazos e documentos.
   *
   * Permissão: ADMIN e COLABORADOR
   */
  @Post(":id/analisar-edital")
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  @UseInterceptors(FileInterceptor("pdf"))
  async analisarEdital(
    @Param("id") id: string,
    @Tenant() empresaId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }), // 50MB
          new FileTypeValidator({ fileType: "application/pdf" }),
        ],
      }),
    )
    pdf: Express.Multer.File,
  ) {
    return this.bidService.analisarEdital(id, empresaId, pdf);
  }

  @Post(":id/chat")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  async chat(
    @Param("id") id: string,
    @Body() dto: ChatPerguntaDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const empresaId = req.user?.empresaId;
    if (!empresaId) {
      throw new BadRequestException("Empresa não identificada no token");
    }

    return this.bidService.chatComEdital(id, dto.pergunta, empresaId);
  }

  @Get(":id/chat/historico")
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  async chatHistorico(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const empresaId = req.user?.empresaId;
    if (!empresaId) {
      throw new BadRequestException("Empresa não identificada no token");
    }

    return this.bidService.getChatHistorico(id, empresaId);
  }
}
