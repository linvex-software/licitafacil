'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Radio, Bell, X, Search } from 'lucide-react'
import { CardPregao } from '@/components/monitoramento/CardPregao'
import type { PregaoMonitorado } from '@/components/monitoramento/CardPregao'
import { useMonitoramentoSocket } from '@/hooks/useMonitoramentoSocket'
import { listarPregoesPncp, cadastrarPregaoMonitorado } from '@/lib/api'
import { useAuth } from '@/contexts/auth-context'
import { AuthGuard } from '@/components/AuthGuard'
import { Layout } from '@/components/layout'
import { useRouter } from 'next/navigation'

const ITENS_POR_PAGINA = 50

function MonitoramentoContent() {
  const { user } = useAuth()
  const router = useRouter()
  const [pregoes, setPregoes] = useState<PregaoMonitorado[]>([])
  const [carregando, setCarregando] = useState(true)
  const [filtroPortal, setFiltroPortal] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [dataFiltro, setDataFiltro] = useState(new Date().toISOString().slice(0, 10))
  const [busca, setBusca] = useState('')
  const [pagina, setPagina] = useState(1)
  const [urlManual, setUrlManual] = useState('')
  const [adicionando, setAdicionando] = useState(false)
  const [erroAdicionar, setErroAdicionar] = useState('')
  const [mostrarAdicionar, setMostrarAdicionar] = useState(false)

  const { conectado, reconectando, updates, alertas } = useMonitoramentoSocket(user?.empresaId)

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const dados = await listarPregoesPncp(dataFiltro)
      setPregoes(dados)
    } catch {
      setPregoes([])
    } finally {
      setCarregando(false)
    }
  }, [dataFiltro])

  useEffect(() => { carregar() }, [carregar])

  useEffect(() => { setPagina(1) }, [filtroPortal, filtroStatus, dataFiltro, busca])

  useEffect(() => {
    if (updates.length === 0) return
    setPregoes(prev => {
      const novo = [...prev]
      for (const u of updates) {
        const idx = novo.findIndex(p => p.numeroPregao === u.numeroPregao)
        if (idx >= 0) novo[idx] = { ...novo[idx], ...u }
      }
      return novo
    })
  }, [updates])

  const pregoesFiltrados = pregoes.filter(p => {
    if (filtroPortal && p.portal !== filtroPortal) return false
    if (filtroStatus && p.status !== filtroStatus) return false
    if (busca.trim()) {
      const q = busca.toLowerCase()
      if (!p.objeto?.toLowerCase().includes(q) &&
          !p.orgao?.toLowerCase().includes(q) &&
          !p.numeroPregao?.toLowerCase().includes(q)) return false
    }
    return true
  })

  const totalFiltrados = pregoesFiltrados.length
  const totalPaginas = Math.ceil(totalFiltrados / ITENS_POR_PAGINA)
  const pregoesPaginados = pregoesFiltrados.slice(
    (pagina - 1) * ITENS_POR_PAGINA,
    pagina * ITENS_POR_PAGINA
  )

  const adicionarManual = async () => {
    if (!urlManual.startsWith('http')) {
      setErroAdicionar('Informe uma URL válida começando com http')
      return
    }
    setAdicionando(true)
    setErroAdicionar('')
    try {
      await cadastrarPregaoMonitorado(urlManual)
      setUrlManual('')
      setMostrarAdicionar(false)
      carregar()
    } catch (e: any) {
      setErroAdicionar(e?.message || 'Erro ao adicionar pregão')
    } finally {
      setAdicionando(false)
    }
  }

  const handleCriarLicitacao = (pregao: PregaoMonitorado) => {
    const params = new URLSearchParams({
      numero: pregao.numeroPregao,
      objeto: pregao.objeto?.slice(0, 200) || '',
      orgao: pregao.orgao || '',
    })
    router.push(`/licitacoes?criar=true&${params.toString()}`)
  }

  const handleAnalisarEdital = (pregao: PregaoMonitorado) => {
    const url = pregao.urlFallbackPncp || pregao.urlSalaDisputa
    window.open(url, '_blank')
    router.push('/licitacoes')
  }

  return (
    <div className="space-y-6">

      {alertas.length > 0 && (
        <div className="space-y-2">
          {alertas.map((a, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <Bell className="h-4 w-4 text-green-400 animate-bounce flex-shrink-0" />
              <p className="text-sm text-green-400 font-medium flex-1">
                🔔 Pregão <span className="font-bold">{a.numeroPregao}</span> entrou em disputa agora!
              </p>
              <a href={a.urlSalaDisputa} target="_blank" rel="noopener noreferrer"
                className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400 hover:bg-green-500/30">
                Abrir
              </a>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pregões do Dia</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Acompanhe em tempo real todos os pregões em múltiplos portais
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs">
            <div className={`w-2 h-2 rounded-full ${conectado ? 'bg-green-400' : reconectando ? 'bg-yellow-400 animate-pulse' : 'bg-red-400'}`} />
            <span className="text-muted-foreground">{conectado ? 'Conectado' : reconectando ? 'Reconectando...' : 'Desconectado'}</span>
          </div>
          <button
            onClick={() => setMostrarAdicionar(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Adicionar pregão
          </button>
        </div>
      </div>

      {mostrarAdicionar && (
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium">Adicionar pregão para monitorar</p>
          <p className="text-xs text-muted-foreground">Cole a URL do edital no PNCP ou da sala de disputa do portal</p>
          <div className="flex gap-2">
            <input
              type="url"
              value={urlManual}
              onChange={e => setUrlManual(e.target.value)}
              placeholder="https://pncp.gov.br/app/editais/..."
              className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              onClick={adicionarManual}
              disabled={adicionando}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {adicionando ? 'Adicionando...' : 'Adicionar'}
            </button>
            <button onClick={() => setMostrarAdicionar(false)} className="p-2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          {erroAdicionar && <p className="text-xs text-red-400">{erroAdicionar}</p>}
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={busca}
            onChange={e => { setBusca(e.target.value); setPagina(1) }}
            placeholder="Buscar por objeto ou órgão..."
            className="pl-8 pr-3 py-1.5 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary w-64"
          />
        </div>
        <input
          type="date"
          value={dataFiltro}
          onChange={e => setDataFiltro(e.target.value)}
          className="px-3 py-1.5 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <select
          value={filtroPortal}
          onChange={e => setFiltroPortal(e.target.value)}
          className="px-3 py-1.5 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">Todos os portais</option>
          <option value="COMPRASNET">ComprasNet</option>
          <option value="BNC">BNC</option>
          <option value="PNCP">PNCP</option>
        </select>
        <select
          value={filtroStatus}
          onChange={e => setFiltroStatus(e.target.value)}
          className="px-3 py-1.5 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">Todos os status</option>
          <option value="AGUARDANDO">Aguardando</option>
          <option value="EM_DISPUTA">Em disputa</option>
          <option value="ENCERRADO">Encerrado</option>
        </select>
        <span className="text-xs text-muted-foreground ml-auto">
          {carregando
            ? 'Buscando pregões...'
            : `${totalFiltrados} pregão(ões) · página ${pagina} de ${totalPaginas || 1}`}
        </span>
      </div>

      {carregando ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-4 border-border" />
            <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin absolute inset-0" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">Buscando pregões do dia</p>
            <p className="text-xs text-muted-foreground mt-1">
              Consultando API do PNCP — pode levar alguns segundos
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full mt-4 opacity-30">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-lg p-4 h-36 animate-pulse" />
            ))}
          </div>
        </div>
      ) : pregoesFiltrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Radio className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <p className="text-sm font-medium text-muted-foreground">Nenhum pregão encontrado para esta data</p>
          <p className="text-xs text-muted-foreground mt-1">Tente outra data ou adicione um pregão manualmente</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pregoesPaginados.map((p, i) => (
              <CardPregao
                key={p.id ?? `${p.numeroPregao}-${i}`}
                pregao={p}
                onCriarLicitacao={handleCriarLicitacao}
                onAnalisarEdital={handleAnalisarEdital}
              />
            ))}
          </div>

          {totalPaginas > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setPagina(p => Math.max(1, p - 1))}
                disabled={pagina === 1}
                className="px-3 py-1.5 text-sm border border-border rounded-md disabled:opacity-40 hover:bg-accent transition-colors"
              >
                ← Anterior
              </button>
              <span className="text-sm text-muted-foreground px-2">
                {pagina} / {totalPaginas}
              </span>
              <button
                onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                disabled={pagina === totalPaginas}
                className="px-3 py-1.5 text-sm border border-border rounded-md disabled:opacity-40 hover:bg-accent transition-colors"
              >
                Próxima →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function MonitoramentoPage() {
  return (
    <AuthGuard>
      <Layout>
        <MonitoramentoContent />
      </Layout>
    </AuthGuard>
  )
}
