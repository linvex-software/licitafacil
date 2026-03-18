import { IsOptional, IsString } from 'class-validator'

export class AtualizarPregaoDto {
  @IsOptional()
  @IsString()
  bidId?: string
}

