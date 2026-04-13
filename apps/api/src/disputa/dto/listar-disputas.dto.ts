import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";
import { DisputaStatus } from "@prisma/client";

export class ListarDisputasQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsEnum(DisputaStatus)
  status?: DisputaStatus;

  @IsOptional()
  @IsUUID()
  bidId?: string;

  /** Filtro exato pelo número do pregão gravado na disputa */
  @IsOptional()
  @IsString()
  numeroPregao?: string;
}
