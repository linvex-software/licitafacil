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
import {
  AutorTipo,
  EfeitoRecurso,
  EscopoImpugnacao,
  StatusPeticao,
  TipoPeticao,
} from "@prisma/client";
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString, IsUUID } from "class-validator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TenantGuard } from "../common/guards/tenant.guard";
import { Tenant } from "../common/decorators/tenant.decorator";
import { JuridicoService } from "./juridico.service";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Public } from "../auth/decorators/public.decorator";
import type { User } from "@licitafacil/shared";

export class GerarPeticaoDto {
  @IsUUID()
  bidId!: string;

  @IsEnum(TipoPeticao)
  tipo!: TipoPeticao;

  @IsString()
  conteudo!: string;

  @IsOptional()
  @IsString()
  nomeEmpresa?: string;

  @IsOptional()
  @IsString()
  cnpj?: string;

  @IsOptional()
  @IsString()
  endereco?: string;

  @IsOptional()
  @IsString()
  cidade?: string;

  @IsOptional()
  @IsEnum(EscopoImpugnacao)
  escopoImpugnacao?: EscopoImpugnacao;

  @IsOptional()
  @IsEnum(EfeitoRecurso)
  efeitoRecurso?: EfeitoRecurso;

  @IsOptional()
  @IsBoolean()
  anonimo?: boolean;

  @IsOptional()
  @IsEnum(AutorTipo)
  autorTipo?: AutorTipo;

  @IsOptional()
  @IsString()
  motivoIntencao?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  itensContestados?: string[];
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
    @CurrentUser() user: User,
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
          userId: user.id,
          conteudo: dto.conteudo,
          nomeEmpresa: dto.nomeEmpresa,
          cnpj: dto.cnpj,
          endereco: dto.endereco,
          cidade: dto.cidade,
          escopoImpugnacao: dto.escopoImpugnacao,
          efeitoRecurso: dto.efeitoRecurso,
          anonimo: dto.anonimo,
          autorTipo: dto.autorTipo,
          motivoIntencao: dto.motivoIntencao,
          itensContestados: dto.itensContestados,
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

  @Get("verificar/:codigo")
  @Public()
  async verificarAutenticidade(@Param("codigo") codigo: string) {
    return this.juridicoService.verificarAutenticidade(codigo);
  }
}
