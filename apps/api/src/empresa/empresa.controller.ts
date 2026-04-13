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
} from "@nestjs/common";
import { EmpresaService } from "./empresa.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { Tenant } from "../common/decorators/tenant.decorator";
import { TenantGuard } from "../common/guards/tenant.guard";
import { createEmpresaSchema, type Empresa, UserRole } from "@licitafacil/shared";

@Controller("empresas")
export class EmpresaController {
  constructor(private readonly empresaService: EmpresaService) {}

  /**
   * Cria uma nova empresa
   * POST /empresas
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: unknown): Promise<Empresa> {
    // Validar dados de entrada com Zod
    const result = createEmpresaSchema.safeParse(body);

    if (!result.success) {
      throw new BadRequestException({
        message: "Dados inválidos",
        errors: result.error.errors,
      });
    }

    return this.empresaService.create(result.data);
  }

  /**
   * Busca a empresa do usuário autenticado
   * GET /empresas/me
   * 
   * Permissão: ADMIN e COLABORADOR podem ver
   */
  @Get("me")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  async findMyEmpresa(@Tenant() empresaId: string): Promise<Empresa> {
    return this.empresaService.findMyEmpresa(empresaId);
  }

  /**
   * Plano atual da empresa (billing) — visível a qualquer usuário do tenant.
   * GET /empresas/me/plano
   */
  @Get("me/plano")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  async getMePlano(@Tenant() empresaId: string) {
    return this.empresaService.getMePlano(empresaId);
  }

  /**
   * Atualiza dados da empresa do usuário autenticado (nome e/ou segmento)
   * PATCH /empresas/me
   */
  @Patch("me")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateMyEmpresa(
    @Tenant() empresaId: string,
    @Body() body: { nome?: string; segmento?: string },
  ): Promise<Empresa> {
    if (body.nome !== undefined && body.nome.trim().length < 2) {
      throw new BadRequestException("Nome da empresa deve ter pelo menos 2 caracteres.");
    }
    if (body.nome === undefined && body.segmento === undefined) {
      throw new BadRequestException("Informe ao menos um campo para atualizar.");
    }
    return this.empresaService.atualizarDados(empresaId, body);
  }

  /**
   * Busca a configuração de alerta de pregão
   * GET /empresas/configuracoes/alertas
   */
  @Get("configuracoes/alertas")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  async getConfigAlerta(@Tenant() empresaId: string) {
    return this.empresaService.getConfigAlerta(empresaId);
  }

  /**
   * Salva a configuração de alerta de pregão
   * PATCH /empresas/configuracoes/alertas
   */
  @Patch("configuracoes/alertas")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  async updateConfigAlerta(
    @Tenant() empresaId: string,
    @Body() body: { minutosAlertaPregao: number },
  ) {
    return this.empresaService.updateConfigAlerta(empresaId, body.minutosAlertaPregao);
  }

  /**
   * Busca uma empresa por ID (com validação de tenant)
   * GET /empresas/:id
   * Só permite buscar a própria empresa
   *
   * Permissão: ADMIN e COLABORADOR podem ver
   */
  @Get(":id")
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  async findOne(@Param("id") id: string, @Tenant() empresaId: string): Promise<Empresa> {
    return this.empresaService.findOne(id, empresaId);
  }
}
