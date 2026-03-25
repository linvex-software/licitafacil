import { IsEnum } from "class-validator";

export enum ResultadoOperadorDisputa {
  GANHOU = "GANHOU",
  PERDEU = "PERDEU",
  DESISTIU = "DESISTIU",
}

export class PatchResultadoDisputaDto {
  @IsEnum(ResultadoOperadorDisputa)
  resultado!: ResultadoOperadorDisputa;
}
