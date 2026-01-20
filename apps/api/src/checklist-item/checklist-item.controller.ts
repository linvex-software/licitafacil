import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UseGuards,
  UseInterceptors,
  Req,
} from "@nestjs/common";
import { ChecklistItemService } from "./checklist-item.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { DevBypassGuard } from "../auth/guards/dev-bypass.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { Tenant } from "../common/decorators/tenant.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Audit } from "../audit-log/decorators/audit.decorator";
import { AuditInterceptor } from "../audit-log/interceptors/audit.interceptor";
import {
  createChecklistItemSchema,
  updateChecklistItemSchema,
  markChecklistItemCompletedSchema,
  type LicitacaoChecklistItem,
  type User,
  UserRole,
} from "@licitafacil/shared";
import type { Request } from "express";

/**
 * Controller para gerenciar itens de checklist de licitações
 *
 * Todos os endpoints requerem autenticação e isolamento por tenant
 */
@Controller("checklist-items")
@UseGuards(DevBypassGuard, JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
export class ChecklistItemController {
  constructor(private readonly checklistItemService: ChecklistItemService) {}

  /**
   * Cria um novo item de checklist para uma licitação
   * POST /checklist-items
   *
   * Permissão: ADMIN e COLABORADOR
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  @Audit({ action: "checklist-item.create", resourceType: "ChecklistItem" })
  async create(
    @Body() body: unknown,
    @Tenant() empresaId: string,
    @CurrentUser() _user: User,
    @Req() _request: Request,
  ): Promise<LicitacaoChecklistItem> {
    // Validar dados de entrada com Zod
    const result = createChecklistItemSchema.safeParse(body);

    if (!result.success) {
      throw new BadRequestException({
        message: "Dados inválidos",
        errors: result.error.errors,
      });
    }

    return this.checklistItemService.create(result.data, empresaId);
  }

  /**
   * Lista todos os itens de checklist de uma licitação
   * GET /checklist-items/licitacao/:licitacaoId
   *
   * Permissão: ADMIN e COLABORADOR
   */
  @Get("licitacao/:licitacaoId")
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  async findByLicitacao(
    @Param("licitacaoId") licitacaoId: string,
    @Tenant() empresaId: string,
  ): Promise<LicitacaoChecklistItem[]> {
    return this.checklistItemService.findAll({
      empresaId,
      licitacaoId,
    });
  }

  /**
   * Busca um item de checklist específico por ID
   * GET /checklist-items/:id
   *
   * Permissão: ADMIN e COLABORADOR
   */
  @Get(":id")
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  async findOne(
    @Param("id") id: string,
    @Tenant() empresaId: string,
  ): Promise<LicitacaoChecklistItem> {
    return this.checklistItemService.findOne(id, empresaId);
  }

  /**
   * Marca um item como concluído
   * POST /checklist-items/:id/complete
   *
   * Permissão: ADMIN e COLABORADOR
   */
  @Post(":id/complete")
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  @Audit({ action: "checklist-item.complete", resourceType: "ChecklistItem", captureResourceId: true })
  async markAsCompleted(
    @Param("id") id: string,
    @Body() body: unknown,
    @Tenant() empresaId: string,
    @CurrentUser() user: User,
    @Req() _request: Request,
  ): Promise<LicitacaoChecklistItem> {
    // Validar dados de entrada com Zod
    const result = markChecklistItemCompletedSchema.safeParse(body);

    if (!result.success) {
      throw new BadRequestException({
        message: "Dados inválidos",
        errors: result.error.errors,
      });
    }

    return this.checklistItemService.markAsCompleted(
      id,
      empresaId,
      user.id,
      result.data.evidenciaId,
    );
  }

  /**
   * Desmarca um item (marca como não concluído)
   * POST /checklist-items/:id/incomplete
   *
   * Permissão: ADMIN e COLABORADOR
   */
  @Post(":id/incomplete")
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  @Audit({ action: "checklist-item.incomplete", resourceType: "ChecklistItem", captureResourceId: true })
  async markAsIncomplete(
    @Param("id") id: string,
    @Tenant() empresaId: string,
    @CurrentUser() _user: User,
    @Req() _request: Request,
  ): Promise<LicitacaoChecklistItem> {
    return this.checklistItemService.markAsIncomplete(id, empresaId);
  }

  /**
   * Atualiza um item de checklist
   * PATCH /checklist-items/:id
   *
   * Permissão: ADMIN e COLABORADOR
   */
  @Patch(":id")
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  @Audit({ action: "checklist-item.update", resourceType: "ChecklistItem", captureResourceId: true })
  async update(
    @Param("id") id: string,
    @Body() body: unknown,
    @Tenant() empresaId: string,
    @CurrentUser() _user: User,
    @Req() _request: Request,
  ): Promise<LicitacaoChecklistItem> {
    // Validar dados de entrada com Zod
    const result = updateChecklistItemSchema.safeParse(body);

    if (!result.success) {
      throw new BadRequestException({
        message: "Dados inválidos",
        errors: result.error.errors,
      });
    }

    return this.checklistItemService.update(id, result.data, empresaId);
  }
}
