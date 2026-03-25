import { IsInt, IsNumber, Min } from "class-validator";

export class PostLanceDisputaDto {
  @IsInt()
  @Min(1)
  itemNumero!: number;

  @IsNumber()
  @Min(0.01)
  valor!: number;
}
