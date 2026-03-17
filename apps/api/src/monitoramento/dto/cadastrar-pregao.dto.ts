import { IsString, IsOptional } from 'class-validator'

export class CadastrarPregaoDto {
  @IsString()
  url!: string // URL da sala de disputa ou do edital no PNCP

  @IsOptional()
  @IsString()
  bidId?: string

  @IsOptional()
  @IsString()
  numeroPregao?: string
}
