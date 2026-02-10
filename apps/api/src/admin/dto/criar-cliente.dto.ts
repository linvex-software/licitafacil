import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
} from "class-validator";
import { PlanoTipo } from "@prisma/client";

export class CriarClienteDto {
  // Step 1: Dados da Empresa
  @IsString()
  @IsNotEmpty({ message: "Nome da empresa é obrigatório" })
  nomeEmpresa!: string;

  @IsString()
  @Matches(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, {
    message: "CNPJ deve estar no formato XX.XXX.XXX/XXXX-XX",
  })
  cnpj!: string;

  @IsEmail({}, { message: "Email comercial inválido" })
  email!: string;

  @IsString()
  @IsOptional()
  telefone?: string;

  @IsString()
  @IsOptional()
  responsavelComercial?: string;

  // Step 2: Plano e Billing
  @IsEnum(PlanoTipo, { message: "Plano deve ser STARTER, PROFESSIONAL ou ENTERPRISE" })
  plano!: PlanoTipo;

  @IsNumber({}, { message: "Valor de setup deve ser um número" })
  @Min(0)
  valorSetup!: number;

  @IsNumber({}, { message: "Mensalidade deve ser um número" })
  @Min(0)
  mensalidade!: number;

  @IsString()
  @IsNotEmpty({ message: "Data de início é obrigatória" })
  dataInicio!: string; // ISO 8601

  // Step 3: Limites (opcionais, usa defaults do plano via AdminService)
  @IsNumber()
  @IsOptional()
  maxUsuarios?: number;

  @IsNumber()
  @IsOptional()
  maxStorageGB?: number;

  @IsNumber()
  @IsOptional()
  maxLicitacoesMes?: number;

  // Step 4: Admin inicial
  @IsString()
  @IsNotEmpty({ message: "Nome do admin é obrigatório" })
  nomeAdmin!: string;

  @IsEmail({}, { message: "Email do admin inválido" })
  emailAdmin!: string;
}
