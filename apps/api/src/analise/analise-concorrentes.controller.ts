import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { FeatureAccessGuard } from "../common/guards/feature-access.guard";
import { RequireFeature } from "../common/decorators/require-feature.decorator";
import { AnaliseConcorrentesService } from "./analise-concorrentes.service";

@UseGuards(JwtAuthGuard, FeatureAccessGuard)
@RequireFeature("analytics_concorrencia")
@Controller("analise")
export class AnaliseConcorrentesController {
  constructor(
    private readonly analiseConcorrentesService: AnaliseConcorrentesService,
  ) {}

  @Get("concorrentes")
  async concorrentes(@Query("cnpj") cnpj: string) {
    if (!cnpj?.trim()) {
      throw new BadRequestException("cnpj é obrigatório");
    }

    const cnpjLimpo = cnpj.replace(/\D/g, "");
    if (cnpjLimpo.length !== 14) {
      throw new BadRequestException("cnpj deve conter 14 dígitos numéricos");
    }

    return this.analiseConcorrentesService.buscarConcorrente(cnpjLimpo);
  }
}
