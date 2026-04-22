'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  buscarLicitacoes,
  criarDisputa,
  type LicitacaoResumo,
  type PortalDisputa,
} from '@/lib/api'

function isBillingHandledError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  return Boolean((error as { _billingHandled?: boolean })._billingHandled)
}
import { useToast } from '@/hooks/use-toast'
import type { PregaoMonitorado } from '@/components/monitoramento/CardPregao'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'

const LABEL_PORTAL: Record<string, string> = {
  COMPRASNET: 'ComprasNet',
  BNC: 'BNC',
  PNCP: 'PNCP',
}

/** Converte portal do monitoramento (PNCP/BNC/COMPRASNET) para o enum da disputa (apenas COMPRASNET | BNC). */
export function portalMonitoramentoParaDisputa(portal: string): PortalDisputa {
  const p = portal.trim().toUpperCase()
  if (p === 'BNC') return 'BNC'
  return 'COMPRASNET'
}

export interface IniciarDisputaModalProps {
  open: boolean
  onClose: () => void
  pregao: PregaoMonitorado
  /** Pré-seleciona vínculo (ex.: tab da licitação) */
  bidIdInicial?: string
  /** Oculta o select e fixa bidIdInicial */
  ocultarSelectLicitacao?: boolean
}

export function IniciarDisputaModal({
  open,
  onClose,
  pregao,
  bidIdInicial,
  ocultarSelectLicitacao,
}: IniciarDisputaModalProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [licitacoes, setLicitacoes] = useState<LicitacaoResumo[]>([])
  const [loadingBids, setLoadingBids] = useState(false)
  const [bidId, setBidId] = useState<string>('')

  const portalDisputa = useMemo(() => portalMonitoramentoParaDisputa(pregao.portal), [pregao.portal])

  useEffect(() => {
    if (!open) return
    setBidId(bidIdInicial && ocultarSelectLicitacao ? bidIdInicial : '')
    if (ocultarSelectLicitacao && bidIdInicial) {
      setBidId(bidIdInicial)
      return
    }
    let cancelled = false
    setLoadingBids(true)
    buscarLicitacoes()
      .then((data) => {
        if (!cancelled) setLicitacoes(data)
      })
      .catch(() => {
        if (!cancelled) setLicitacoes([])
      })
      .finally(() => {
        if (!cancelled) setLoadingBids(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, bidIdInicial, ocultarSelectLicitacao])

  useEffect(() => {
    if (open && bidIdInicial && !ocultarSelectLicitacao) {
      setBidId(bidIdInicial)
    }
  }, [open, bidIdInicial, ocultarSelectLicitacao])

  if (!open) return null

  const horarioFmt = (() => {
    try {
      return new Date(pregao.horarioInicio).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return pregao.horarioInicio
    }
  })()

  const handleConfirm = async () => {
    setLoading(true)
    try {
      const vinculo = ocultarSelectLicitacao ? bidIdInicial : bidId
      const created = await criarDisputa({
        portal: portalDisputa,
        numeroPregao: pregao.numeroPregao?.trim() || undefined,
        bidId: vinculo || undefined,
      })
      toast({ title: 'Disputa iniciada', description: 'Redirecionando para a sala ao vivo.' })
      router.push(`/disputa/${created.id}/ao-vivo`)
      onClose()
    } catch (error: unknown) {
      if (isBillingHandledError(error)) return
      const msg =
        error &&
        typeof error === 'object' &&
        'response' in error &&
        error.response &&
        typeof error.response === 'object' &&
        'data' in error.response &&
        error.response.data &&
        typeof error.response.data === 'object' &&
        'message' in error.response.data
          ? String((error.response.data as { message?: unknown }).message)
          : 'Erro ao iniciar disputa'
      toast({ title: 'Não foi possível iniciar', description: msg, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => !loading && onClose()}
        aria-label="Fechar"
      />
      <div
        className="relative z-10 w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <h2 className="text-lg font-semibold text-zinc-100">Iniciar Disputa</h2>
          <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-zinc-300">
            {LABEL_PORTAL[pregao.portal] ?? pregao.portal}
          </span>
        </div>

        <div className="mb-4 space-y-2 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 text-sm text-zinc-300">
          <p>
            <span className="text-zinc-500">Número:</span> {pregao.numeroPregao}
          </p>
          <p className="line-clamp-3">
            <span className="text-zinc-500">Objeto:</span> {pregao.objeto || '—'}
          </p>
          <p>
            <span className="text-zinc-500">Órgão:</span> {pregao.orgao || '—'}
          </p>
          <p>
            <span className="text-zinc-500">Horário da sessão:</span> {horarioFmt}
          </p>
        </div>

        {!ocultarSelectLicitacao && (
          <div className="mb-6 space-y-2">
            <p className="text-xs font-medium text-zinc-400">Vincular à licitação (opcional)</p>
            <Select
              value={bidId || '__none__'}
              onValueChange={(v) => setBidId(v === '__none__' ? '' : v)}
              disabled={loadingBids}
            >
              <SelectTrigger className="border-zinc-700 bg-zinc-950 text-zinc-100">
                <SelectValue
                  placeholder={loadingBids ? 'Carregando...' : 'Nenhuma — criar disputa avulsa'}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Nenhuma — criar disputa avulsa</SelectItem>
                {licitacoes.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    <span className="line-clamp-1">
                      {b.title} · {b.agency}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {ocultarSelectLicitacao && bidIdInicial && (
          <p className="mb-6 text-xs text-zinc-500">
            Esta disputa será vinculada à licitação atual.
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            className="border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-800"
            onClick={() => onClose()}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            className="bg-primary text-primary-foreground hover:bg-[#e0e0e0]"
            disabled={loading}
            onClick={() => void handleConfirm()}
          >
            {loading ? 'Iniciando...' : 'Iniciar disputa'}
          </Button>
        </div>
      </div>
    </div>
  )
}
