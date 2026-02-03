import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
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
import {
  createEmpresaSchema,
  updateEmpresaPlanoSchema,
  type Empresa,
  UserRole,
} from "@licitafacil/shared";

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
   * Atualiza o plano da empresa do usuário (upgrade/downgrade ou usuários extras).
   * PATCH /empresas/me
   *
   * Permissão: apenas ADMIN
   */
  @Patch("me")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateMyEmpresaPlano(
    @Tenant() empresaId: string,
    @Body() body: unknown,
  ): Promise<Empresa> {
    const result = updateEmpresaPlanoSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException({
        message: "Dados inválidos",
        errors: result.error.errors,
      });
    }
    return this.empresaService.updatePlano(empresaId, empresaId, result.data);
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
