import { IsEnum, IsNumber, IsOptional, IsString, Min, MinLength } from "class-validator";
import { Type } from "class-transformer";

export enum ResultadoOperadorDisputa {
  GANHOU = "GANHOU",
  PERDEU = "PERDEU",
  DESISTIU = "DESISTIU",
}

export class PatchResultadoDisputaDto {
  @IsEnum(ResultadoOperadorDisputa)
  resultado!: ResultadoOperadorDisputa;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  valorFinal?: number;

  @IsOptional()
  @IsString()
  @MinLength(2)
  observacao?: string;
}
