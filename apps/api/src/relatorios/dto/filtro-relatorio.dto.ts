import {
  IsOptional,
  IsString,
  IsArray,
  IsDateString,
  ValidateIf,
} from "class-validator";
import { Transform } from "class-transformer";

export class FiltroRelatorioDto {
  @IsOptional()
  @ValidateIf((o) => o.dataInicio !== "" && o.dataInicio != null)
  @IsDateString()
  @Transform(({ value }) => (value === "" ? undefined : value))
  dataInicio?: string;

  @IsOptional()
  @ValidateIf((o) => o.dataFim !== "" && o.dataFim != null)
  @IsDateString()
  @Transform(({ value }) => (value === "" ? undefined : value))
  dataFim?: string;

  @IsOptional()
  @IsString()
  periodo?: "mes" | "trimestre" | "ano" | "custom";

  @IsOptional()
  @IsArray()
  status?: string[];

  @IsOptional()
  @IsArray()
  modalidades?: string[];

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === "" ? undefined : value))
  orgao?: string;
}
