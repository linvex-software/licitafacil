import { StatusItemDisputa } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";

export class SnapshotItemExtensaoDto {
  @IsInt()
  @Min(1)
  numeroItem!: number;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsNumber()
  melhorLance?: number;

  @IsOptional()
  @IsInt()
  posicaoAtual?: number;

  @IsOptional()
  @IsEnum(StatusItemDisputa)
  status?: StatusItemDisputa;

  @IsOptional()
  @IsString()
  vencedor?: string;

  @IsOptional()
  @IsNumber()
  valorFinal?: number;
}

export class SnapshotExtensaoDto {
  @IsString()
  disputaId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SnapshotItemExtensaoDto)
  itens!: SnapshotItemExtensaoDto[];
}
