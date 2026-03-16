'use client'
import { useEffect, useState } from 'react'
import { ExternalLink, Clock, TrendingDown, Plus, Sparkles } from 'lucide-react'

export interface PregaoMonitorado {
  id?: string
  numeroPregao: string
  objeto: string
  orgao: string
  portal: string
  status: string
  horarioInicio: string
  urlSalaDisputa: string
  urlFallbackPncp?: string
  melhorLance?: number
}

interface CardPregaoProps {
  pregao: PregaoMonitorado
  onCriarLicitacao?: (pregao: PregaoMonitorado) => void
  onAnalisarEdital?: (pregao: PregaoMonitorado) => void
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
  useEffect(() => {
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
  }, [horario])
  return texto
}

export function CardPregao({ pregao, onCriarLicitacao, onAnalisarEdital }: CardPregaoProps) {
  const countdown = useCountdown(pregao.horarioInicio)

  const badgeStatus = {
    AGUARDANDO: 'bg-muted text-muted-foreground',
    EM_DISPUTA: 'bg-green-500/20 text-green-400 border border-green-500/30 animate-pulse',
    ENCERRADO: 'bg-muted/50 text-muted-foreground',
    CANCELADO: 'bg-red-500/20 text-red-400',
  }[pregao.status] ?? 'bg-muted text-muted-foreground'

  const labelStatus = {
    AGUARDANDO: 'Aguardando',
    EM_DISPUTA: '● Em disputa',
    ENCERRADO: 'Encerrado',
    CANCELADO: 'Cancelado',
  }[pregao.status] ?? pregao.status

  const temUrlPortal = pregao.urlSalaDisputa &&
    !pregao.urlSalaDisputa.includes('pncp.gov.br') &&
    pregao.urlSalaDisputa.startsWith('http')

  const urlBadge = temUrlPortal
    ? <span className="text-xs text-green-400 flex items-center gap-1">🟢 Abre no portal do processo</span>
    : <span className="text-xs text-yellow-500 flex items-center gap-1">🟡 Abre no PNCP</span>

  const urlAbrir = pregao.urlSalaDisputa || pregao.urlFallbackPncp || '#'

  return (
    <div className={`bg-card border rounded-lg p-4 flex flex-col gap-3 transition-all
      ${pregao.status === 'EM_DISPUTA' ? 'border-green-500/40 ring-1 ring-green-500/20' : 'border-border'}
      ${pregao.status === 'ENCERRADO' ? 'opacity-60' : ''}
    `}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${CORES_PORTAL[pregao.portal] ?? 'bg-muted text-muted-foreground border-border'}`}>
            {LABEL_PORTAL[pregao.portal] ?? pregao.portal}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeStatus}`}>
            {labelStatus}
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
        </p>
      </div>

      {pregao.melhorLance && (
        <div className="flex items-center gap-1 text-xs text-green-400">
          <TrendingDown className="h-3 w-3" />
          Melhor lance: R$ {pregao.melhorLance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </div>
      )}

      <div className="flex items-center justify-between pt-1 border-t border-border">
        {urlBadge}
        <a
          href={urlAbrir}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Abrir <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-border">
        <button
          onClick={() => onCriarLicitacao?.(pregao)}
          className="text-xs px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:border-primary transition-colors flex items-center gap-1"
          title="Criar licitação no sistema a partir deste pregão"
        >
          <Plus className="h-3 w-3" /> Criar licitação
        </button>
        <button
          onClick={() => onAnalisarEdital?.(pregao)}
          className="text-xs px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:border-purple-400 transition-colors flex items-center gap-1"
          title="Analisar edital com IA"
        >
          <Sparkles className="h-3 w-3" /> Analisar IA
        </button>
      </div>
    </div>
  )
}
