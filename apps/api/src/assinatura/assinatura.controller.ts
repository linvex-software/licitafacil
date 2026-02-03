import { Controller, Get, UseGuards } from "@nestjs/common";
import { AssinaturaService } from "./assinatura.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { Tenant } from "../common/decorators/tenant.decorator";
import { UserRole } from "@licitafacil/shared";

/**
 * Retorna status da assinatura da empresa.
 * Não usa AssinaturaAtivaGuard para que o front saiba o status mesmo quando vencida (e exiba tela de renovação).
 */
@Controller("assinaturas")
export class AssinaturaController {
  constructor(private readonly assinaturaService: AssinaturaService) {}

  @Get("status")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.COLABORADOR)
  async getStatus(@Tenant() empresaId: string) {
    return this.assinaturaService.getStatusByEmpresaId(empresaId);
  }
}
