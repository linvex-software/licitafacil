import { IsOptional, IsString } from "class-validator";

export class UpdateDisputaDto {
  @IsOptional()
  @IsString()
  detalhe?: string;
}
