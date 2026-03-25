'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Layout } from '@/components/layout'
import { AuthGuard } from '@/components/AuthGuard'
import { useAuth } from '@/contexts/auth-context'
import {
  Download,
  Chrome,
  ToggleRight,
  FolderOpen,
  Plug,
  AlertCircle,
  Loader2,
} from 'lucide-react'

type StatusConexao = 'aguardando' | 'detectando' | 'instalada' | 'conectando' | 'conectada' | 'nao_instalada' | 'erro'

function resolverWsApiUrl() {
  const raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
  if (raw.startsWith('https://')) return raw.replace('https://', 'wss://')
  if (raw.startsWith('http://')) return raw.replace('http://', 'ws://')
  return raw
}

export default function ExtensaoPage() {
  const { token } = useAuth()
  const router = useRouter()
  const [status, setStatus] = useState<StatusConexao>('aguardando')
  const [mensagemErro, setMensagemErro] = useState('')
  const apiWsUrl = resolverWsApiUrl()

  const detectarExtensao = useCallback(async () => {
    const marker = document.getElementById('lvx-extensao-presente')
    if (marker) return true

    return await new Promise<boolean>((resolve) => {
      let finalizado = false
      const timeout = window.setTimeout(() => {
        if (finalizado) return
        finalizado = true
        window.removeEventListener('message', onMessage)
        resolve(false)
      }, 1500)

      const onMessage = (event: MessageEvent) => {
        if (finalizado) return
        if (event.data?.tipo === 'LVX_EXTENSAO_PRESENTE') {
          finalizado = true
          window.clearTimeout(timeout)
          window.removeEventListener('message', onMessage)
          resolve(true)
        }
      }

      window.addEventListener('message', onMessage)
      window.postMessage({ tipo: 'LVX_PING' }, '*')
    })
  }, [])

  // Detecção ativa ao carregar (com retries curtos)
  useEffect(() => {
    let ativo = true
    const run = async () => {
      for (let i = 0; i < 3; i += 1) {
        const ok = await detectarExtensao()
        if (!ativo) return
        if (ok) {
          setStatus((prev) => (prev === 'conectada' ? prev : 'instalada'))
          return
        }
        await new Promise((r) => setTimeout(r, 400))
      }
    }
    void run()
    return () => {
      ativo = false
    }
  }, [detectarExtensao])

  // Escutar resposta via postMessage
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (!event.data || typeof event.data !== 'object') return
      if (event.data.tipo === 'LVX_EXTENSAO_PRESENTE') setStatus('instalada')
      if (event.data.tipo === 'LVX_JWT_SALVO') setStatus('conectada')
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  const conectarExtensao = useCallback(() => {
    if (!token) {
      setMensagemErro('Sessão inválida. Faça login novamente.')
      setStatus('erro')
      return
    }

    setMensagemErro('')
    setStatus('detectando')

    const conectar = async () => {
      // até 3 tentativas para contornar timing de injeção do content script
      for (let i = 0; i < 3; i += 1) {
        const presente = await detectarExtensao()
        if (presente) {
          setStatus('conectando')
          window.postMessage(
            { tipo: 'LVX_CONFIGURAR_JWT', jwt: token, apiUrl: apiWsUrl },
            '*',
          )
          return
        }
        await new Promise((r) => setTimeout(r, 500))
      }

      setStatus('nao_instalada')
      setMensagemErro(
        'Não foi possível detectar a extensão nesta página. Recarregue a aba, confirme permissão para localhost e tente novamente.',
      )
    }

    void conectar()
  }, [apiWsUrl, detectarExtensao, token])

  useEffect(() => {
    if (status !== 'conectando') return
    const timeout = setTimeout(() => {
      setStatus((atual) => (atual === 'conectando' ? 'erro' : atual))
      setMensagemErro('Extensão detectada, mas não confirmou o salvamento do token.')
    }, 6000)
    return () => clearTimeout(timeout)
  }, [status])

  useEffect(() => {
    // fallback: se extensão responder PING durante detectando, já configura direto
    const enviarJwt = (event: MessageEvent) => {
      if (event.data?.tipo === 'LVX_EXTENSAO_PRESENTE' && token && status === 'detectando') {
        setStatus('conectando')
        window.postMessage(
          { tipo: 'LVX_CONFIGURAR_JWT', jwt: token, apiUrl: apiWsUrl },
          '*',
        )
      }
    }
    window.addEventListener('message', enviarJwt)
    return () => window.removeEventListener('message', enviarJwt)
  }, [apiWsUrl, status, token])

  const isBusy = status === 'detectando' || status === 'conectando'
  const isDisabled = isBusy || status === 'conectada'

  return (
    <AuthGuard>
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-10 space-y-10">

          {/* Header */}
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
              Instalar extensão do Chrome
            </h1>
            <p className="text-sm text-slate-400">
              A extensão LVX conecta o portal Compras.gov.br ao Limvex em tempo real,
              permitindo envio automático de lances durante a disputa.
            </p>
            <p className="text-xs text-slate-500 pt-0.5">
              Compatível com Google Chrome, Microsoft Edge e outros navegadores baseados em Chromium.
              Não compatível com Safari.
            </p>
          </div>

          {/* Botão de download */}
          <a
            href="/lvx-licitacao-extensao.zip"
            download
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            Baixar extensão
          </a>

          {/* Passos de instalação */}
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-slate-300 uppercase tracking-wider">
              Instalação — passo a passo
            </h2>
            <div className="divide-y divide-slate-800 rounded-xl border border-slate-800 overflow-hidden">

              {/* Passo 1 */}
              <div className="flex items-start gap-4 px-5 py-4 bg-slate-900">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-xs font-semibold text-slate-400">
                  1
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Download className="w-4 h-4 text-slate-500" />
                    <span className="text-sm font-medium text-slate-200">Baixar a extensão</span>
                  </div>
                  <p className="text-sm text-slate-400">
                    Clique no botão verde &quot;Baixar extensão&quot; no topo desta página.
                    Um arquivo chamado <code className="px-1 py-0.5 rounded text-xs bg-slate-800 text-emerald-400 font-mono">lvx-licitacao-extensao.zip</code> vai
                    aparecer na pasta Downloads do seu computador.
                  </p>
                </div>
              </div>

              {/* Passo 2 */}
              <div className="flex items-start gap-4 px-5 py-4 bg-slate-900">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-xs font-semibold text-slate-400">
                  2
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Chrome className="w-4 h-4 text-slate-500" />
                    <span className="text-sm font-medium text-slate-200">Abrir o gerenciador de extensões</span>
                  </div>
                  <p className="text-sm text-slate-400">
                    Clique aqui para copiar o endereço:{' '}
                    <a
                      href="chrome://extensions"
                      onClick={(e) => {
                        e.preventDefault()
                        navigator.clipboard.writeText('chrome://extensions')
                        alert('Endereço copiado! Cole na barra de endereço do Chrome e pressione Enter.')
                      }}
                      className="text-blue-400 underline cursor-pointer"
                    >
                      chrome://extensions
                    </a>
                    {' '}— depois cole na barra de endereço do Chrome e pressione Enter.
                  </p>
                </div>
              </div>

              {/* Passo 3 */}
              <div className="flex items-start gap-4 px-5 py-4 bg-slate-900">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-xs font-semibold text-slate-400">
                  3
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <ToggleRight className="w-4 h-4 text-slate-500" />
                    <span className="text-sm font-medium text-slate-200">Ativar o modo desenvolvedor</span>
                  </div>
                  <p className="text-sm text-slate-400">
                    Na página que abriu, procure no canto superior direito uma chave chamada
                    &quot;Modo do desenvolvedor&quot;. Clique nela para ativar — ela ficará azul.
                    Se já estiver azul, pode pular este passo.
                  </p>
                </div>
              </div>

              {/* Passo 4 */}
              <div className="flex items-start gap-4 px-5 py-4 bg-slate-900">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-xs font-semibold text-slate-400">
                  4
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <FolderOpen className="w-4 h-4 text-slate-500" />
                    <span className="text-sm font-medium text-slate-200">Instalar a extensão</span>
                  </div>
                  <p className="text-sm text-slate-400">
                    Abra a pasta Downloads no seu computador. Clique com o botão direito no
                    arquivo <code className="px-1 py-0.5 rounded text-xs bg-slate-800 text-emerald-400 font-mono">lvx-licitacao-extensao.zip</code> e
                    escolha &quot;Extrair aqui&quot;. Uma pasta vai aparecer. Volte para a
                    página de extensões do Chrome, clique em &quot;Carregar sem compactação&quot;
                    e selecione essa pasta que foi extraída.
                  </p>
                </div>
              </div>

            </div>

            {/* CTA pós-instalação */}
            <p className="text-sm text-slate-400 pt-1">
              Pronto! Agora role a página para baixo e clique em{' '}
              <strong className="text-slate-200">Conectar extensão</strong>.
            </p>
          </div>

          {/* Seção de conexão */}
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-slate-300 uppercase tracking-wider">
              Conexão
            </h2>

            {/* Card: instalada mas não conectada */}
            {status === 'instalada' && (
              <div className="px-5 py-4 rounded-xl border border-teal-700 bg-teal-950">
                <p className="text-sm font-semibold text-teal-400">✓ Extensão encontrada!</p>
                <p className="text-sm text-teal-200 mt-1">
                  Clique no botão abaixo para conectar automaticamente ao Limvex.
                  Você não precisa digitar nenhuma senha ou token.
                </p>
              </div>
            )}

            {/* Card: não instalada */}
            {status === 'nao_instalada' && (
              <div className="px-5 py-4 rounded-xl border border-amber-700 bg-amber-950">
                <p className="text-sm font-semibold text-amber-400">Extensão não encontrada</p>
                <p className="text-sm text-amber-200 mt-1">
                  Siga os 4 passos acima para instalar a extensão.
                  Depois clique no botão abaixo para tentar novamente.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-3 px-4 py-2 rounded text-sm border border-amber-500 text-amber-300 hover:bg-amber-900 transition-colors"
                >
                  Já instalei — verificar novamente
                </button>
              </div>
            )}

            {/* Card: conectada */}
            {status === 'conectada' && (
              <div className="px-5 py-4 rounded-xl border border-teal-700 bg-teal-950">
                <p className="text-sm font-semibold text-teal-300">✓ Extensão conectada com sucesso!</p>
                <p className="text-sm text-teal-200 mt-1">
                  Tudo pronto. Agora vá para o Monitoramento para acompanhar os pregões ao vivo.
                </p>
                <button
                  onClick={() => router.push('/monitoramento')}
                  className="mt-3 px-4 py-2 rounded text-sm bg-teal-700 text-white hover:bg-teal-600 transition-colors"
                >
                  Ir para Monitoramento →
                </button>
              </div>
            )}

            {/* Card: erro de sessão */}
            {status === 'erro' && (
              <div className="flex items-center gap-3 px-5 py-4 rounded-xl border border-red-800 bg-red-950">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-300">{mensagemErro}</p>
              </div>
            )}

            {/* Botão principal de conexão */}
            {status !== 'conectada' && (
              <button
                onClick={conectarExtensao}
                disabled={isDisabled}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-200 font-medium text-sm transition-colors"
              >
                {isBusy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plug className="w-4 h-4" />
                )}
                {status === 'detectando'
                  ? 'Detectando extensão...'
                  : status === 'conectando'
                    ? 'Enviando token...'
                    : 'Conectar extensão'}
              </button>
            )}
          </div>

        </div>
      </Layout>
    </AuthGuard>
  )
}
