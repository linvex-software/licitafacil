import {
  IsString,
  IsNumber,
  IsDateString,
  IsEnum,
  IsOptional,
  Min,
} from "class-validator";
import { TipoPagamento } from "@prisma/client";

export class RegistrarPagamentoDto {
  @IsString()
  contratoId!: string;

  @IsEnum(TipoPagamento)
  tipo!: TipoPagamento;

  @IsNumber()
  @Min(0)
  valor!: number;

  @IsDateString()
  dataPrevista!: string;

  @IsDateString()
  @IsOptional()
  dataPago?: string;

  @IsString()
  @IsOptional()
  metodoPagamento?: string;

  @IsString()
  @IsOptional()
  comprovanteUrl?: string;

  @IsString()
  @IsOptional()
  observacoes?: string;
}
