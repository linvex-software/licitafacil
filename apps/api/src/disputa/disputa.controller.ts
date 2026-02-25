import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { IsNumber, IsOptional, IsString, Max, Min } from "class-validator";
import type { Request } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { DisputaService } from "./disputa.service";

interface AuthenticatedRequest extends Request {
  user?: {
    empresaId?: string;
  };
}

export class SimularLanceDto {
  @IsNumber()
  @Min(0.01)
  valorInicial!: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  percentualDesconto!: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  numConcorrentes?: number;

  @IsOptional()
  @IsString()
  bidId?: string;
}

@UseGuards(JwtAuthGuard)
@Controller("disputa")
export class DisputaController {
  constructor(private readonly disputaService: DisputaService) {}

  @Post("simular")
  async simular(@Body() dto: SimularLanceDto, @Req() req: AuthenticatedRequest) {
    const empresaId = req.user?.empresaId;
    if (!empresaId) {
      throw new UnauthorizedException("Empresa não identificada no token");
    }

    const numConcorrentes = dto.numConcorrentes ?? 3;
    const resultado = this.disputaService.simularLance(
      dto.valorInicial,
      dto.percentualDesconto,
      numConcorrentes,
    );

    if (dto.bidId) {
      await this.disputaService.salvarSimulacao(empresaId, dto.bidId, {
        valorInicial: dto.valorInicial,
        percentualDesconto: dto.percentualDesconto,
        numConcorrentes,
        lanceSugerido: resultado.lanceSugerido,
        lanceMinimo: resultado.lanceMinimo,
        lanceAgressivo: resultado.lanceAgressivo,
      });
    }

    return resultado;
  }

  @Get("historico/:bidId")
  async historico(@Param("bidId") bidId: string, @Req() req: AuthenticatedRequest) {
    const empresaId = req.user?.empresaId;
    if (!empresaId) {
      throw new UnauthorizedException("Empresa não identificada no token");
    }
    if (!bidId) {
      throw new BadRequestException("bidId é obrigatório");
    }

    return this.disputaService.getHistorico(empresaId, bidId);
  }
}
