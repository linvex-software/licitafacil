import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UseGuards,
} from "@nestjs/common";
import { EmpresaService } from "./empresa.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Tenant } from "../common/decorators/tenant.decorator";
import { TenantGuard } from "../common/guards/tenant.guard";
import { createEmpresaSchema, type Empresa } from "@licitafacil/shared";

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
   */
  @Get("me")
  @UseGuards(JwtAuthGuard)
  async findMyEmpresa(@Tenant() empresaId: string): Promise<Empresa> {
    return this.empresaService.findMyEmpresa(empresaId);
  }

  /**
   * Busca uma empresa por ID (com validação de tenant)
   * GET /empresas/:id
   * Só permite buscar a própria empresa
   */
  @Get(":id")
  @UseGuards(JwtAuthGuard, TenantGuard)
  async findOne(@Param("id") id: string, @Tenant() empresaId: string): Promise<Empresa> {
    return this.empresaService.findOne(id, empresaId);
  }
}
