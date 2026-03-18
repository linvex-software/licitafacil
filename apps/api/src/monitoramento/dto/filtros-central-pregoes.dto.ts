import { IsEnum, IsOptional, IsString, Matches } from 'class-validator'
import { PortalMonitoramento, ResultadoPregao } from '@prisma/client'

export enum PeriodoCentralPregoes {
  INICIO = 'INICIO',
  FINALIZACAO = 'FINALIZACAO',
}

export class FiltrosCentralPregoesDto {
  @IsOptional()
  @IsEnum(PortalMonitoramento)
  portal?: PortalMonitoramento

  @IsOptional()
  @IsEnum(ResultadoPregao)
  resultado?: ResultadoPregao

  @IsOptional()
  @IsEnum(PeriodoCentralPregoes)
  periodoPor?: PeriodoCentralPregoes

  // yyyy-MM-dd
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dataInicio?: string

  // yyyy-MM-dd
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dataFim?: string

  @IsOptional()
  @IsString()
  licitacao?: string

  @IsOptional()
  @IsString()
  page?: string

  @IsOptional()
  @IsString()
  limit?: string
}

