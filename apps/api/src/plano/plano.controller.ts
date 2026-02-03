import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { PlanoService } from "./plano.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AssinaturaAtivaGuard } from "../assinatura/assinatura.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { Tenant } from "../common/decorators/tenant.decorator";
import type { Plano } from "@licitafacil/shared";
import { UserRole } from "@licitafacil/shared";

@Controller("planos")
export class PlanoController {
  constructor(private readonly planoService: PlanoService) {}

  /**
   * Lista planos ativos (para seleção no cadastro de empresa)
   * GET /planos
   */
  @Get()
  @UseGuards(JwtAuthGuard, AssinaturaAtivaGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  async findAll(): Promise<Plano[]> {
    return this.planoService.findAll();
  }

  /**
   * Retorna uso do plano da empresa do usuário (usuários ativos, limite, pode adicionar).
   * GET /planos/uso
   */
  @Get("uso")
  @UseGuards(JwtAuthGuard, AssinaturaAtivaGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  async getUso(@Tenant() empresaId: string) {
    return this.planoService.getUsoByEmpresaId(empresaId);
  }

  /**
   * Busca plano por ID
   * GET /planos/:id
   */
  @Get(":id")
  @UseGuards(JwtAuthGuard, AssinaturaAtivaGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  async findOne(@Param("id") id: string): Promise<Plano> {
    return this.planoService.findById(id);
  }
}
