'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Swords } from 'lucide-react'
import { listarDisputas, type Disputa } from '@/lib/api'
import { IniciarDisputaModal } from '@/components/monitoramento/IniciarDisputaModal'
import type { PregaoMonitorado } from '@/components/monitoramento/CardPregao'

function badgeAoVivo(d: Disputa) {
  return d.status === 'AO_VIVO' || d.status === 'INICIANDO' || d.status === 'PAUSADA'
}

function labelResultado(d: Disputa) {
  if (d.resultado && d.resultado !== 'EM_ANDAMENTO') {
    const map: Record<string, string> = {
      GANHOU: 'Ganhou',
      PERDEU: 'Perdeu',
      DESISTIU: 'Desistiu',
      CANCELADO: 'Cancelado',
    }
    return map[d.resultado] ?? d.resultado
  }
  if (d.status === 'ENCERRADA') return 'Encerrada'
  return null
}

export function LicitacaoDisputasSection({
  bidId,
  licitacaoTitle,
  licitacaoAgency,
}: {
  bidId: string
  licitacaoTitle: string
  licitacaoAgency: string
}) {
  const [modalOpen, setModalOpen] = useState(false)

  const { data: disputas = [], isLoading } = useQuery({
    queryKey: ['disputas', 'bid', bidId],
    queryFn: () => listarDisputas({ bidId }),
    enabled: Boolean(bidId),
  })

  const pregaoSintetico: PregaoMonitorado = {
    numeroPregao: licitacaoTitle.slice(0, 120),
    objeto: licitacaoTitle,
    orgao: licitacaoAgency,
    portal: 'COMPRASNET',
    status: 'AGUARDANDO',
    horarioInicio: new Date().toISOString(),
    urlSalaDisputa: '#',
  }

  return (
    <div className="space-y-4">
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando disputas...</p>
      ) : disputas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-12 text-center dark:border-gray-700">
          <Swords className="mb-4 h-12 w-12 text-muted-foreground/30" />
          <p className="mb-4 text-sm text-muted-foreground">
            Nenhuma disputa vinculada a esta licitação
          </p>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="rounded-lg bg-[#0078D1] px-4 py-2 text-sm font-medium text-white hover:bg-[#0078D1]/90"
          >
            Iniciar disputa para esta licitação
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {disputas.map((disputa) => (
            <div
              key={disputa.id}
              className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-zinc-900/50 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {disputa.numeroPregao || 'Disputa'}
                </span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {new Date(disputa.createdAt).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {badgeAoVivo(disputa) && (
                  <span className="animate-pulse rounded px-2 py-0.5 text-xs font-medium bg-red-500/20 text-red-400">
                    AO VIVO
                  </span>
                )}
                {!badgeAoVivo(disputa) && labelResultado(disputa) && (
                  <span className="rounded bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400">
                    {labelResultado(disputa)}
                  </span>
                )}
                <Link href={`/disputa/${disputa.id}/ao-vivo`}>
                  <button
                    type="button"
                    className="text-sm font-medium text-[#0078D1] hover:underline"
                  >
                    {badgeAoVivo(disputa) ? 'Ver ao vivo' : 'Ver detalhes'}
                  </button>
                </Link>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="w-full rounded-lg border border-dashed border-gray-300 py-2 text-sm text-muted-foreground hover:border-[#0078D1]/50 hover:text-[#0078D1] dark:border-gray-700"
          >
            Iniciar outra disputa
          </button>
        </div>
      )}

      <IniciarDisputaModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        pregao={pregaoSintetico}
        bidIdInicial={bidId}
        ocultarSelectLicitacao
      />
    </div>
  )
}
