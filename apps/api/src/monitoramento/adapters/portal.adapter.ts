import { PortalMonitoramento } from '@prisma/client'

export interface PregaoInfo {
  numeroPregao: string
  objeto: string
  orgao: string
  horarioInicio: Date
  urlSalaDisputa: string
  urlFallbackPncp?: string
  portal: PortalMonitoramento
  status: 'AGUARDANDO' | 'EM_DISPUTA' | 'ENCERRADO' | 'CANCELADO'
  melhorLance?: number
}

export interface PortalAdapter {
  buscarPregoesPorData(data: Date): Promise<PregaoInfo[]>
  buscarPregaoPorUrl(url: string): Promise<PregaoInfo | null>
}
