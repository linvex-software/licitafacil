import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AnaliseService } from "./analise.service";

@UseGuards(JwtAuthGuard)
@Controller("analise")
export class AnaliseController {
  constructor(private readonly analiseService: AnaliseService) {}

  @Get("historico-compras")
  async historicoCompras(
    @Query("cnpj") cnpj: string,
    @Query("meses") meses?: string,
  ) {
    if (!cnpj?.trim()) {
      throw new BadRequestException("cnpj é obrigatório");
    }

    const mesesNumber = meses ? Number(meses) : 12;
    if (!Number.isFinite(mesesNumber) || mesesNumber <= 0) {
      throw new BadRequestException("meses deve ser um número maior que zero");
    }

    return this.analiseService.analisarHistoricoOrgao(cnpj, mesesNumber);
  }

  @Get("concorrentes")
  async concorrentes(@Query("cnpj") cnpj: string) {
    if (!cnpj?.trim()) {
      throw new BadRequestException("cnpj é obrigatório");
    }
    return this.analiseService.analisarConcorrente(cnpj);
  }

  @Get("produtos")
  async produtos(@Query("categoria") categoria: string) {
    if (!categoria?.trim()) {
      throw new BadRequestException("categoria é obrigatória");
    }
    return this.analiseService.analisarProdutos(categoria);
  }
}
