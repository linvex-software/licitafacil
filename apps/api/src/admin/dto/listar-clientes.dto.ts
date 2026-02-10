import { IsEnum, IsOptional, IsString } from "class-validator";
import { ClienteStatus } from "@prisma/client";

export class ListarClientesDto {
  @IsOptional()
  @IsEnum(ClienteStatus)
  status?: ClienteStatus;

  @IsOptional()
  @IsString()
  busca?: string; // nome ou CNPJ

  @IsOptional()
  @IsString()
  orderBy?: "nomeEmpresa" | "dataInicio" | "mensalidade";

  @IsOptional()
  @IsString()
  orderDirection?: "asc" | "desc";
}
