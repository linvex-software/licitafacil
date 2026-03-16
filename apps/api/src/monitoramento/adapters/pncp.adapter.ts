import { Injectable, Logger } from '@nestjs/common'
import { PortalMonitoramento } from '@prisma/client'
import { PortalAdapter, PregaoInfo } from './portal.adapter'

@Injectable()
export class PncpAdapter implements PortalAdapter {
  private readonly logger = new Logger(PncpAdapter.name)
  private readonly BASE_URL = 'https://pncp.gov.br/api/consulta/v1'

  private detectarPortal(link: string): PortalMonitoramento {
    if (link.includes('comprasnet') || link.includes('compras.gov')) return PortalMonitoramento.COMPRASNET
    if (link.includes('licitardigital')) return PortalMonitoramento.LICITAR_DIGITAL
    if (link.includes('bnc') || link.includes('bnccompras')) return PortalMonitoramento.BNC
    return PortalMonitoramento.PNCP
  }

  private detectarStatus(situacao: string): PregaoInfo['status'] {
    const s = situacao?.toLowerCase() || ''
    if (s.includes('cancelad')) return 'CANCELADO'
    if (s.includes('encerrad') || s.includes('homologad')) return 'ENCERRADO'
    if (s.includes('disputa') || s.includes('aberto')) return 'EM_DISPUTA'
    return 'AGUARDANDO'
  }

  async buscarPregoesPorData(data: Date): Promise<PregaoInfo[]> {
    const dataStr = data.toISOString().slice(0, 10).replace(/-/g, '')
    const resultados: PregaoInfo[] = []
    let pagina = 1
    let continuar = true

    while (continuar) {
      try {
        const url = `${this.BASE_URL}/contratacoes/publicacao?dataInicial=${dataStr}&dataFinal=${dataStr}&codigoModalidadeContratacao=8&pagina=${pagina}&tamanhoPagina=50`
        const res = await fetch(url, { headers: { accept: 'application/json' } })

        if (!res.ok) break

        const dados = await res.json()
        const items: any[] = dados?.data ?? dados ?? []

        if (!Array.isArray(items) || items.length === 0) {
          continuar = false
          break
        }

        for (const item of items) {
          const link: string = (item.linkSistemaOrigem || item.linkSistemaExternoPcaItem || '').trim()
          const numeroControle: string = item.numeroControlePNCP || ''

          // Montar URL canônica do PNCP como fallback
          // numeroControlePNCP formato: CNPJ-tipo-seq/ano ex: "00394494000136-1-000616/2024"
          let urlFallbackPncp = ''
          const matchControle = numeroControle.match(/^(\d+)-\d+-(\d+)\/(\d{4})$/)
          if (matchControle) {
            const [, cnpj, seq, ano] = matchControle
            urlFallbackPncp = `https://pncp.gov.br/app/editais/${cnpj}/${ano}/${parseInt(seq)}`
          }

          resultados.push({
            numeroPregao: item.numeroCompra || numeroControle || '',
            objeto: item.objetoCompra || '',
            orgao: item.orgaoEntidade?.razaoSocial || item.unidadeOrgao?.nomeUnidade || '',
            horarioInicio: new Date(item.dataAberturaProposta || item.dataPublicacaoPncp),
            urlSalaDisputa: link || urlFallbackPncp,
            urlFallbackPncp,
            portal: this.detectarPortal(link),
            status: this.detectarStatus(item.situacaoCompraNome || ''),
          })
        }

        if (pagina >= 10 || items.length < 50) continuar = false
        else pagina++
      } catch (err) {
        this.logger.error(`Erro ao buscar PNCP página ${pagina}: ${(err as Error).message}`)
        continuar = false
      }
    }

    return resultados
  }

  async buscarPregaoPorUrl(url: string): Promise<PregaoInfo | null> {
    try {
      const match = url.match(/\/(\d{14})\/(\d{4})\/(\d+)/)
      if (!match) return null

      const [, cnpj, ano, seq] = match
      const res = await fetch(
        `${this.BASE_URL}/orgaos/${cnpj}/compras/${ano}/${seq}`,
        { headers: { accept: 'application/json' } },
      )
      if (!res.ok) return null

      const item = await res.json()
      const link: string = item.linkSistemaOrigem || url

      return {
        numeroPregao: item.numeroCompra || '',
        objeto: item.objetoCompra || '',
        orgao: item.orgaoEntidade?.razaoSocial || '',
        horarioInicio: new Date(item.dataAberturaProposta || item.dataPublicacaoPncp),
        urlSalaDisputa: link,
        portal: this.detectarPortal(link),
        status: this.detectarStatus(item.situacaoCompraNome || ''),
      }
    } catch {
      return null
    }
  }
}
