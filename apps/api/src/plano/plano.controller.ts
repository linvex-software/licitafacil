import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { PlanoService } from "./plano.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  async findAll(): Promise<Plano[]> {
    return this.planoService.findAll();
  }

  /**
   * Busca plano por ID
   * GET /planos/:id
   */
  @Get(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  async findOne(@Param("id") id: string): Promise<Plano> {
    return this.planoService.findById(id);
  }
}
