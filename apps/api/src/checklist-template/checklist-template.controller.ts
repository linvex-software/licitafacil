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
import { ChecklistTemplateService } from "./checklist-template.service";
import { SoftDeleteService } from "../common/services/soft-delete.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AssinaturaAtivaGuard } from "../assinatura/assinatura.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { Tenant } from "../common/decorators/tenant.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Audit } from "../audit-log/decorators/audit.decorator";
import { AuditInterceptor } from "../audit-log/interceptors/audit.interceptor";
import {
  createChecklistTemplateSchema,
  updateChecklistTemplateSchema,
  type ChecklistTemplate,
  type User,
  UserRole,
} from "@licitafacil/shared";
import type { Request } from "express";

/**
 * Controller para gerenciar templates de checklist
 *
 * Todos os endpoints requerem autenticação e isolamento por tenant
 */
@Controller("checklist-templates")
@UseGuards(JwtAuthGuard, AssinaturaAtivaGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
export class ChecklistTemplateController {
  constructor(
    private readonly checklistTemplateService: ChecklistTemplateService,
    private readonly softDeleteService: SoftDeleteService,
  ) {}

  /**
   * Cria um novo template de checklist
   * POST /checklist-templates
   *
   * Permissão: ADMIN
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.ADMIN)
  @Audit({ action: "checklist-template.create", resourceType: "ChecklistTemplate" })
  async create(
    @Body() body: unknown,
    @Tenant() empresaId: string,
    @CurrentUser() user: User,
    @Req() _request: Request,
  ): Promise<ChecklistTemplate> {
    // Validar dados de entrada com Zod
    const result = createChecklistTemplateSchema.safeParse(body);

    if (!result.success) {
      throw new BadRequestException({
        message: "Dados inválidos",
        errors: result.error.errors,
      });
    }

    return this.checklistTemplateService.create(result.data, empresaId, user.id);
  }

  /**
   * Lista templates com filtros e paginação
   * GET /checklist-templates
   *
   * Query params:
   * - page: número da página (default: 1)
   * - limit: itens por página (default: 20, max: 100)
   * - modality: filtrar por modalidade
   * - isActive: filtrar por status ativo (true/false)
   * - isDefault: filtrar por template padrão (true/false)
   * - search: buscar por nome
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
    @Query("isActive") isActive?: string,
    @Query("isDefault") isDefault?: string,
    @Query("search") search?: string,
  ) {
    return this.checklistTemplateService.findAll({
      empresaId,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      modality,
      isActive: isActive === "true" ? true : isActive === "false" ? false : undefined,
      isDefault: isDefault === "true" ? true : isDefault === "false" ? false : undefined,
      search,
    });
  }

  /**
   * Busca um template específico por ID
   * GET /checklist-templates/:id
   *
   * Permissão: ADMIN e COLABORADOR
   */
  @Get(":id")
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  async findOne(
    @Param("id") id: string,
    @Tenant() empresaId: string,
  ): Promise<ChecklistTemplate> {
    return this.checklistTemplateService.findOne(id, empresaId);
  }

  /**
   * Atualiza um template de checklist
   * PATCH /checklist-templates/:id
   *
   * Permissão: ADMIN
   */
  @Patch(":id")
  @Roles(UserRole.ADMIN)
  @Audit({ action: "checklist-template.update", resourceType: "ChecklistTemplate", captureResourceId: true })
  async update(
    @Param("id") id: string,
    @Body() body: unknown,
    @Tenant() empresaId: string,
    @CurrentUser() _user: User,
    @Req() _request: Request,
  ): Promise<ChecklistTemplate> {
    // Validar dados de entrada com Zod
    const result = updateChecklistTemplateSchema.safeParse(body);

    if (!result.success) {
      throw new BadRequestException({
        message: "Dados inválidos",
        errors: result.error.errors,
      });
    }

    return this.checklistTemplateService.update(id, result.data, empresaId);
  }

  /**
   * Remove um template (soft delete)
   * DELETE /checklist-templates/:id
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
    // Validar que o template existe antes de deletar
    await this.checklistTemplateService.remove(id, empresaId);

    // Fazer soft delete com auditoria
    await this.softDeleteService.delete("checklistTemplate", id, empresaId, user.id, request);

    return {
      message: "Template de checklist deletado com sucesso",
      id,
    };
  }

  /**
   * Restaura um template deletado
   * POST /checklist-templates/:id/restore
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
    await this.softDeleteService.restore("checklistTemplate", id, empresaId, user.id, request);

    return {
      message: "Template de checklist restaurado com sucesso",
      id,
    };
  }

  /**
   * Busca templates por modalidade
   * GET /checklist-templates/by-modality/:modality
   *
   * Permissão: ADMIN e COLABORADOR
   */
  @Get("by-modality/:modality")
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  async findByModality(
    @Param("modality") modality: string,
    @Tenant() empresaId: string,
  ): Promise<ChecklistTemplate[]> {
    return this.checklistTemplateService.findByModality(modality, empresaId);
  }

  /**
   * Busca templates padrão por modalidade
   * GET /checklist-templates/default/:modality
   *
   * Permissão: ADMIN e COLABORADOR
   */
  @Get("default/:modality")
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  async findDefaultByModality(
    @Param("modality") modality: string,
    @Tenant() empresaId: string,
  ): Promise<ChecklistTemplate[]> {
    return this.checklistTemplateService.findDefaultByModality(modality, empresaId);
  }

  /**
   * Conta total de templates da empresa
   * GET /checklist-templates/stats/count
   *
   * Permissão: ADMIN e COLABORADOR
   */
  @Get("stats/count")
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  async count(@Tenant() empresaId: string) {
    const total = await this.checklistTemplateService.count(empresaId);
    return {
      total,
      empresaId,
    };
  }
}
