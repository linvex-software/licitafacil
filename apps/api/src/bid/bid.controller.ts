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
  Req,
} from "@nestjs/common";
import { BidService } from "./bid.service";
import { SoftDeleteService } from "../common/services/soft-delete.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { Tenant } from "../common/decorators/tenant.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import {
  createBidSchema,
  updateBidSchema,
  type Bid,
  type User,
  UserRole,
} from "@licitafacil/shared";
import type { Request } from "express";

/**
 * Controller para gerenciar licitações
 * 
 * Todos os endpoints requerem autenticação e isolamento por tenant
 */
@Controller("bids")
@UseGuards(JwtAuthGuard, RolesGuard)
export class BidController {
  constructor(
    private readonly bidService: BidService,
    private readonly softDeleteService: SoftDeleteService,
  ) {}

  /**
   * Cria uma nova licitação
   * POST /bids
   * 
   * Permissão: ADMIN e COLABORADOR
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  async create(
    @Body() body: unknown,
    @Tenant() empresaId: string,
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
  ) {
    return this.bidService.findAll({
      empresaId,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      modality,
      legalStatus,
      operationalState,
      search,
    });
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
  async update(
    @Param("id") id: string,
    @Body() body: unknown,
    @Tenant() empresaId: string,
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
}
