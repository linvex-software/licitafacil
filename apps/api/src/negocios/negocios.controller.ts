import { BadRequestException, Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Tenant } from "../common/decorators/tenant.decorator";
import { NegociosService } from "./negocios.service";

@Controller("negocios")
@UseGuards(JwtAuthGuard)
export class NegociosController {
  constructor(private readonly negociosService: NegociosService) {}

  @Get("eventos")
  async getEventos(
    @Query("mes") mes: string | undefined,
    @Tenant() empresaId: string,
  ) {
    if (!mes) {
      throw new BadRequestException("Parametro 'mes' obrigatorio. Use o formato YYYY-MM.");
    }

    return this.negociosService.getEventosMes(empresaId, mes);
  }
}
