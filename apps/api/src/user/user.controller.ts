import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import { UserService } from "./user.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { Tenant } from "../common/decorators/tenant.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import {
  type User,
  UserRole,
  createUserSchema,
} from "@licitafacil/shared";

@Controller("users")
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) { }

  /**
   * Lista todos os usuários da empresa (incluindo inativos)
   * GET /users
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  async findAll(@Tenant() empresaId: string) {
    return this.userService.findAllIncludingInactive(empresaId);
  }

  /**
   * Retorna informação de limite de usuários da empresa
   * GET /users/limite
   */
  @Get("limite")
  @Roles(UserRole.ADMIN)
  async obterLimite(@Tenant() empresaId: string) {
    return this.userService.obterLimite(empresaId);
  }

  // ========================================================
  // Configurações de Notificações por Email
  // (rotas /me/* devem vir ANTES das rotas /:id para evitar conflito)
  // ========================================================

  /**
   * Retorna as preferências de notificação do usuário autenticado
   * GET /users/me/notificacoes
   */
  @Get("me/notificacoes")
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  async getNotificacoes(@CurrentUser() currentUser: User) {
    return this.userService.getNotificacoes(currentUser.id);
  }

  /**
   * Atualiza as preferências de notificação do usuário autenticado
   * PATCH /users/me/notificacoes
   */
  @Patch("me/notificacoes")
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  async updateNotificacoes(
    @CurrentUser() currentUser: User,
    @Body()
    dto: {
      receberEmails?: boolean;
      receberDocVencendo?: boolean;
      receberPrazoCritico?: boolean;
      receberRisco?: boolean;
      frequenciaEmail?: string;
    },
  ) {
    return this.userService.updateNotificacoes(currentUser.id, dto);
  }

  /**
   * Cria um novo usuário na empresa
   * POST /users
   * Guard bloqueia se limite atingido
   */
  @Post()
  @Roles(UserRole.ADMIN)
  async create(
    @Body() body: unknown,
    @Tenant() empresaId: string,
    @CurrentUser() user: User,
  ): Promise<User> {
    const result = createUserSchema.safeParse({
      ...(body as any),
      empresaId,
    });

    if (!result.success) {
      throw new BadRequestException({
        message: "Dados inválidos",
        errors: result.error.errors,
      });
    }

    return this.userService.createForEmpresa(empresaId, {
      email: result.data.email,
      password: result.data.password,
      name: result.data.name,
      role: result.data.role,
    }, user.role);
  }

  /**
   * Atualiza um usuário da empresa
   * PATCH /users/:id
   */
  @Patch(":id")
  @Roles(UserRole.ADMIN)
  async update(
    @Param("id") id: string,
    @Body() body: { name?: string; role?: string },
    @Tenant() empresaId: string,
    @CurrentUser() user: User,
  ): Promise<User> {
    return this.userService.updateForEmpresa(id, empresaId, body, user.role);
  }

  /**
   * Desativa um usuário (soft delete)
   * DELETE /users/:id
   */
  @Delete(":id")
  @Roles(UserRole.ADMIN)
  async deactivate(
    @Param("id") id: string,
    @Tenant() empresaId: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.userService.deactivate(id, empresaId, currentUser.id, currentUser.role);
  }

  /**
   * Exclui um usuário permanentemente (hard delete, irreversível)
   * DELETE /users/:id/permanente
   */
  @Delete(":id/permanente")
  @Roles(UserRole.ADMIN)
  async deletePermanent(
    @Param("id") id: string,
    @Tenant() empresaId: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.userService.deletePermanent(id, empresaId, currentUser.id, currentUser.role);
  }

  /**
   * Reativa um usuário desativado
   * POST /users/:id/reativar
   * Guard bloqueia se limite atingido
   */
  @Post(":id/reativar")
  @Roles(UserRole.ADMIN)
  async reactivate(
    @Param("id") id: string,
    @Tenant() empresaId: string,
  ): Promise<User> {
    return this.userService.reactivate(id, empresaId);
  }
}
