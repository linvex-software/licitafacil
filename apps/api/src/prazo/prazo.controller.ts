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
  Req,
} from "@nestjs/common";
import { PrazoService } from "./prazo.service";
import { SoftDeleteService } from "../common/services/soft-delete.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { DevBypassGuard } from "../auth/guards/dev-bypass.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { Tenant } from "../common/decorators/tenant.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Audit } from "../audit-log/decorators/audit.decorator";
import { AuditInterceptor } from "../audit-log/interceptors/audit.interceptor";
import {
  createPrazoSchema,
  updatePrazoSchema,
  type Prazo,
  type User,
  UserRole,
} from "@licitafacil/shared";
import type { Request } from "express";

/**
 * Controller para gerenciar prazos da licitação.
 * Todos os endpoints requerem autenticação e isolamento por tenant.
 */
@Controller("prazos")
@UseGuards(DevBypassGuard, JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
export class PrazoController {
  constructor(
    private readonly prazoService: PrazoService,
    private readonly softDeleteService: SoftDeleteService,
  ) {}

  /**
   * Cria um novo prazo para uma licitação.
   * POST /prazos
   * Permissão: ADMIN e COLABORADOR
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  @Audit({ action: "prazo.create", resourceType: "Prazo" })
  async create(
    @Body() body: unknown,
    @Tenant() empresaId: string,
    @CurrentUser() _user: User,
    @Req() _request: Request,
  ): Promise<Prazo> {
    const result = createPrazoSchema.safeParse(body);

    if (!result.success) {
      throw new BadRequestException({
        message: "Dados inválidos",
        errors: result.error.errors,
      });
    }

    return this.prazoService.create(result.data, empresaId);
  }

  /**
   * Lista todos os prazos de uma licitação (com dias restantes).
   * GET /prazos/bid/:bidId
   * Permissão: ADMIN e COLABORADOR
   */
  @Get("bid/:bidId")
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  async findByBid(@Param("bidId") bidId: string, @Tenant() empresaId: string) {
    return this.prazoService.findAll({ empresaId, bidId });
  }

  /**
   * Lista próximos prazos da empresa (dashboard), ordenados por data.
   * GET /prazos/upcoming?limit=10
   * Permissão: ADMIN e COLABORADOR
   */
  @Get("upcoming")
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  async findUpcoming(
    @Tenant() empresaId: string,
    @Query("limit") limit?: string,
  ) {
    const limitNum = limit ? Math.min(parseInt(limit, 10) || 10, 50) : 10;
    return this.prazoService.findUpcoming(empresaId, limitNum);
  }

  /**
   * Busca um prazo por ID (com dias restantes).
   * GET /prazos/:id
   * Permissão: ADMIN e COLABORADOR
   */
  @Get(":id")
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  async findOne(@Param("id") id: string, @Tenant() empresaId: string) {
    return this.prazoService.findOne(id, empresaId);
  }

  /**
   * Atualiza um prazo.
   * PATCH /prazos/:id
   * Permissão: ADMIN e COLABORADOR
   */
  @Patch(":id")
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  @Audit({ action: "prazo.update", resourceType: "Prazo", captureResourceId: true })
  async update(
    @Param("id") id: string,
    @Body() body: unknown,
    @Tenant() empresaId: string,
    @CurrentUser() _user: User,
    @Req() _request: Request,
  ): Promise<Prazo> {
    const result = updatePrazoSchema.safeParse(body);

    if (!result.success) {
      throw new BadRequestException({
        message: "Dados inválidos",
        errors: result.error.errors,
      });
    }

    return this.prazoService.update(id, result.data, empresaId);
  }

  /**
   * Remove um prazo (soft delete).
   * DELETE /prazos/:id
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
    await this.prazoService.findOne(id, empresaId);
    await this.softDeleteService.delete("prazo", id, empresaId, user.id, request);

    return {
      message: "Prazo removido com sucesso",
      id,
    };
  }

  /**
   * Restaura um prazo deletado.
   * POST /prazos/:id/restore
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
    await this.softDeleteService.restore("prazo", id, empresaId, user.id, request);

    return {
      message: "Prazo restaurado com sucesso",
      id,
    };
  }
}
