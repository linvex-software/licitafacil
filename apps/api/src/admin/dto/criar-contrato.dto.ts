import {
  IsString,
  IsNumber,
  IsDateString,
  IsEnum,
  IsOptional,
  Min,
} from "class-validator";
import { ContratoStatus } from "@prisma/client";

export class CriarContratoDto {
  @IsString()
  empresaId!: string;

  @IsString()
  planoNome!: string;

  @IsNumber()
  @Min(0)
  valorSetup!: number;

  @IsNumber()
  @Min(0)
  valorMensalidade!: number;

  @IsDateString()
  dataInicio!: string;

  @IsEnum(ContratoStatus)
  @IsOptional()
  status?: ContratoStatus;

  @IsString()
  @IsOptional()
  observacoes?: string;
}
