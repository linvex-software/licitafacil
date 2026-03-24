import { EstrategiaLance, PortalLicitacao } from "@prisma/client";
import {
  IsBoolean,
  IsArray,
  IsEnum,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

class CredencialPortalDto {
  @IsString()
  @MinLength(14)
  cnpj!: string;

  @IsString()
  @MinLength(1)
  senha!: string;
}

class ConfiguracaoLanceDto {
  @IsInt()
  @Min(1)
  itemNumero!: number;

  @IsOptional()
  @IsString()
  itemDescricao?: string;

  @IsNumber()
  @Min(0)
  valorMaximo!: number;

  @IsNumber()
  @Min(0)
  valorMinimo!: number;

  @IsEnum(EstrategiaLance)
  estrategia!: EstrategiaLance;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}

export class CreateDisputaDto {
  @IsOptional()
  @IsString()
  bidId?: string;

  /** Alias de bidId (contrato L02 / frontend) */
  @IsOptional()
  @IsString()
  licitacaoId?: string;

  @IsOptional()
  @IsString()
  numeroPregao?: string;

  @IsOptional()
  @IsString()
  uasg?: string;

  @IsEnum(PortalLicitacao)
  portal!: PortalLicitacao;

  @IsOptional()
  @IsISO8601()
  agendadoPara?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CredencialPortalDto)
  credencial?: CredencialPortalDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConfiguracaoLanceDto)
  itens?: ConfiguracaoLanceDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConfiguracaoLanceDto)
  configuracoes?: ConfiguracaoLanceDto[];
}
