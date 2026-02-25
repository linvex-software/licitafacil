import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  Put,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Response } from "express";
import { StatusPeticao, TipoPeticao } from "@prisma/client";
import { IsEnum, IsOptional, IsString, IsUUID } from "class-validator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TenantGuard } from "../common/guards/tenant.guard";
import { Tenant } from "../common/decorators/tenant.decorator";
import { JuridicoService } from "./juridico.service";

export class GerarPeticaoDto {
  @IsUUID()
  bidId!: string;

  @IsEnum(TipoPeticao)
  tipo!: TipoPeticao;

  @IsString()
  conteudo!: string;

  @IsOptional()
  @IsString()
  cnpj?: string;

  @IsOptional()
  @IsString()
  endereco?: string;

  @IsOptional()
  @IsString()
  cidade?: string;
}

class AtualizarStatusPeticaoDto {
  @IsEnum(StatusPeticao)
  status!: StatusPeticao;
}

@Controller("juridico")
@UseGuards(JwtAuthGuard, TenantGuard)
export class JuridicoController {
  private readonly logger = new Logger(JuridicoController.name);

  constructor(private readonly juridicoService: JuridicoService) {}

  @Post("peticoes/gerar")
  async gerarPeticao(
    @Body() dto: GerarPeticaoDto,
    @Tenant() empresaId: string,
    @Res() res: Response,
  ) {
    if (!dto?.bidId || !dto?.tipo || !dto?.conteudo) {
      throw new BadRequestException("bidId, tipo e conteudo são obrigatórios");
    }

    try {
      const result = await this.juridicoService.gerarPeticao(
        dto.bidId,
        dto.tipo,
        {
          conteudo: dto.conteudo,
          cnpj: dto.cnpj,
          endereco: dto.endereco,
          cidade: dto.cidade,
        },
        empresaId,
      );

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      );
      res.setHeader("Content-Disposition", `attachment; filename="${result.nomeArquivo}"`);
      res.status(201).send(result.buffer);
    } catch (error: any) {
      this.logger.error(
        `Falha ao gerar petição | empresaId=${empresaId} | payload=${JSON.stringify(dto)}`,
        error?.stack || error?.message || String(error),
      );
      throw error;
    }
  }

  @Put("peticoes/:id/status")
  async atualizarStatus(
    @Param("id") id: string,
    @Body() dto: AtualizarStatusPeticaoDto,
    @Tenant() empresaId: string,
  ) {
    if (!dto?.status) {
      throw new BadRequestException("status é obrigatório");
    }

    if (![StatusPeticao.ENVIADO, StatusPeticao.RASCUNHO].includes(dto.status)) {
      throw new BadRequestException("status inválido");
    }

    return this.juridicoService.atualizarStatusPeticao(id, dto.status, empresaId);
  }

  @Get("peticoes/:bidId")
  async listarPeticoes(@Param("bidId") bidId: string, @Tenant() empresaId: string) {
    return this.juridicoService.listarPeticoes(bidId, empresaId);
  }
}
