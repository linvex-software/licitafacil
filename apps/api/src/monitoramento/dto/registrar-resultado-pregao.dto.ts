import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator'
import { Transform } from 'class-transformer'
import { FonteValorReferenciaPregao, ResultadoPregao } from '@prisma/client'

export class RegistrarResultadoPregaoDto {
  @IsEnum(ResultadoPregao)
  resultado!: ResultadoPregao

  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : Number(value)))
  @IsNumber()
  @Min(0)
  valorFinal?: number

  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : Number(value)))
  @IsNumber()
  @Min(0)
  valorReferencia?: number

  @IsOptional()
  @IsEnum(FonteValorReferenciaPregao)
  fonteValorReferencia?: FonteValorReferenciaPregao

  @IsOptional()
  @IsString()
  observacao?: string
}

