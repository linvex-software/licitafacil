import { EstrategiaLance, PortalLicitacao } from "@prisma/client";
import {
  ArrayMinSize,
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

  @IsEnum(PortalLicitacao)
  portal!: PortalLicitacao;

  @IsOptional()
  @IsISO8601()
  agendadoPara?: string;

  @ValidateNested()
  @Type(() => CredencialPortalDto)
  credencial!: CredencialPortalDto;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ConfiguracaoLanceDto)
  itens?: ConfiguracaoLanceDto[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ConfiguracaoLanceDto)
  configuracoes?: ConfiguracaoLanceDto[];
}
