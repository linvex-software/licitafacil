import { IsOptional, IsString, IsEnum } from 'class-validator'
import { PortalMonitoramento, StatusPregao } from '@prisma/client'

export class FiltrosPregaoDto {
  @IsOptional()
  @IsString()
  data?: string // YYYY-MM-DD, padrão hoje

  @IsOptional()
  @IsEnum(PortalMonitoramento)
  portal?: PortalMonitoramento

  @IsOptional()
  @IsEnum(StatusPregao)
  status?: StatusPregao

  @IsOptional()
  @IsString()
  bidId?: string
}
