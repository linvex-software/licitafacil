'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ExternalLink, Clock, TrendingDown, Plus, ClipboardEdit, Swords } from 'lucide-react'
import { listarDisputas } from '@/lib/api'
import { IniciarDisputaModal } from '@/components/monitoramento/IniciarDisputaModal'

export interface PregaoMonitorado {
  id?: string
  numeroPregao: string
  objeto: string
  orgao: string
  uf?: string
  portal: string
  status: string
  horarioInicio: string
  urlSalaDisputa: string
  urlFallbackPncp?: string
  melhorLance?: number
  resultado?: string
}

interface CardPregaoProps {
  pregao: PregaoMonitorado
  onCriarLicitacao?: (pregao: PregaoMonitorado) => void
  criandoLicitacao?: boolean
  onRegistrarResultado?: (pregao: PregaoMonitorado) => void
}

const CORES_PORTAL: Record<string, string> = {
  COMPRASNET: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  BNC: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  PNCP: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
}

const LABEL_PORTAL: Record<string, string> = {
  COMPRASNET: 'ComprasNet',
  BNC: 'BNC',
  PNCP: 'PNCP',
}

function useCountdown(horario: string) {
  const [texto, setTexto] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const [visivel, setVisivel] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setVisivel(entry.isIntersecting),
      { threshold: 0.1 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!visivel) return
    function calcular() {
      const diff = new Date(horario).getTime() - Date.now()
      if (diff <= 0) { setTexto('Iniciado'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTexto(h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`)
    }
    calcular()
    const t = setInterval(calcular, 1000)
    return () => clearInterval(t)
  }, [horario, visivel])

  return { texto, ref }
}

export function CardPregao({ pregao, onCriarLicitacao, criandoLicitacao, onRegistrarResultado }: CardPregaoProps) {
  const router = useRouter()
  const { texto: countdown, ref: cardRef } = useCountdown(pregao.horarioInicio)
  const [showDisputaModal, setShowDisputaModal] = useState(false)
  const [acompanharLoading, setAcompanharLoading] = useState(false)

  const temUrlPortal = pregao.urlSalaDisputa &&
    !pregao.urlSalaDisputa.includes('pncp.gov.br') &&
    pregao.urlSalaDisputa.startsWith('http')

  const urlBadge = temUrlPortal
    ? <span className="text-xs text-green-400 flex items-center gap-1">🟢 Abre no portal do processo</span>
    : <span className="text-xs text-yellow-500 flex items-center gap-1">🟡 Abre no PNCP</span>

  const urlAbrir = pregao.urlSalaDisputa || pregao.urlFallbackPncp || '#'

  const handleDisputaClick = async () => {
    const np = pregao.numeroPregao?.trim()
    if (pregao.status === 'EM_DISPUTA' && np) {
      setAcompanharLoading(true)
      try {
        const lista = await listarDisputas({ numeroPregao: np })
        const match = lista.find(
          (d) =>
            d.numeroPregao === np &&
            ['INICIANDO', 'AO_VIVO', 'PAUSADA'].includes(d.status),
        )
        if (match) {
          router.push(`/disputa/${match.id}/ao-vivo`)
          return
        }
      } catch {
        // abre modal
      } finally {
        setAcompanharLoading(false)
      }
    }
    setShowDisputaModal(true)
  }

  return (
    <div ref={cardRef} className={`bg-card border rounded-lg p-4 flex flex-col gap-3 transition-all
      ${pregao.status === 'EM_DISPUTA' ? 'border-green-500/40 ring-1 ring-green-500/20' : 'border-border'}
      ${pregao.status === 'ENCERRADO' ? 'opacity-60' : ''}
    `}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${CORES_PORTAL[pregao.portal] ?? 'bg-muted text-muted-foreground border-border'}`}>
            {LABEL_PORTAL[pregao.portal] ?? pregao.portal}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
          <Clock className="h-3 w-3" />
          {pregao.status === 'AGUARDANDO' ? countdown : new Date(pregao.horarioInicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-foreground line-clamp-2">
          {pregao.objeto || 'Sem descrição'}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {pregao.numeroPregao} · {pregao.orgao}
          {pregao.uf && <span className="ml-1 text-muted-foreground/60">· {pregao.uf}</span>}
        </p>
      </div>

      {pregao.melhorLance && (
        <div className="flex items-center gap-1 text-xs text-green-400">
          <TrendingDown className="h-3 w-3" />
          Melhor lance: R$ {pregao.melhorLance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border">
        {urlBadge}
        <div className="flex flex-wrap items-center gap-2">
          {(pregao.status === 'AGUARDANDO' || pregao.status === 'EM_DISPUTA') && (
            <button
              type="button"
              onClick={() => void handleDisputaClick()}
              disabled={acompanharLoading}
              className="flex items-center gap-2 rounded-lg bg-[#0078D1]/10 px-3 py-1.5 text-sm font-medium text-[#0078D1] transition-colors hover:bg-[#0078D1]/20 disabled:opacity-60"
            >
              <Swords className="h-4 w-4" />
              {acompanharLoading
                ? 'Abrindo...'
                : pregao.status === 'EM_DISPUTA'
                  ? 'Acompanhar disputa'
                  : 'Iniciar disputa'}
            </button>
          )}
          <a
            href={urlAbrir}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Abrir <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      <IniciarDisputaModal
        open={showDisputaModal}
        onClose={() => setShowDisputaModal(false)}
        pregao={pregao}
      />

      {onCriarLicitacao && (
        <div className="flex items-center justify-between pt-1 border-t border-border">
          <button
            type="button"
            onClick={() => onCriarLicitacao(pregao)}
            disabled={!!criandoLicitacao}
            className="text-xs px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:border-primary transition-colors flex items-center gap-1 disabled:opacity-60 disabled:pointer-events-none"
            title="Criar licitação no sistema a partir deste pregão"
          >
            <Plus className="h-3 w-3" /> {criandoLicitacao ? "Criando..." : "Criar licitação"}
          </button>
          <span className="text-[11px] text-muted-foreground">
            Pré-preenche os dados automaticamente
          </span>
        </div>
      )}

      {onRegistrarResultado && pregao.id && (
        <div className="flex items-center justify-between pt-1 border-t border-border">
          <button
            type="button"
            onClick={() => onRegistrarResultado(pregao)}
            className="text-xs px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:border-primary transition-colors flex items-center gap-1"
            title="Registrar resultado deste pregão"
          >
            <ClipboardEdit className="h-3 w-3" /> Registrar resultado
          </button>
          <span className="text-[11px] text-muted-foreground">
            Vai para a Central de Pregões
          </span>
        </div>
      )}

    </div>
  )
}
