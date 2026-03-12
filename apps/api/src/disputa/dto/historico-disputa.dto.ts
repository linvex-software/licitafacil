import { PortalLicitacao } from "@prisma/client";
import { IsEnum, IsInt, IsISO8601, IsOptional, IsString, Min, MinLength } from "class-validator";

export class GetHistoricoDisputaQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsEnum(PortalLicitacao)
  portal?: PortalLicitacao;

  @IsOptional()
  @IsISO8601()
  dataInicio?: string;

  @IsOptional()
  @IsISO8601()
  dataFim?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  licitacao?: string;

  @IsOptional()
  @IsString()
  resultado?: "GANHOU" | "PERDEU" | "CANCELOU";
}

