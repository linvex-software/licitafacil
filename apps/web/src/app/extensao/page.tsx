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
import { Button } from '@/components/ui/button'

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
        <div className="mx-auto max-w-2xl space-y-10 px-4 py-10 text-foreground">

          {/* Header */}
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Instalar extensão do Chrome
            </h1>
            <p className="text-sm text-muted-foreground">
              A extensão LVX conecta o portal Compras.gov.br ao{" "}
              <span className="font-limvex font-medium uppercase text-foreground">LIMVEX</span> em tempo real,
              permitindo envio automático de lances durante a disputa.
            </p>
            <p className="pt-0.5 text-xs text-muted-foreground">
              Compatível com Google Chrome, Microsoft Edge e outros navegadores baseados em Chromium.
              Não compatível com Safari.
            </p>
          </div>

          <Button asChild variant="default" className="h-auto w-full py-3 shadow-none dark:hover:bg-[#e0e0e0]">
            <a href="/lvx-licitacao-extensao.zip" download className="inline-flex items-center justify-center gap-2 text-sm font-medium">
              <Download className="h-4 w-4" />
              Baixar extensão
            </a>
          </Button>

          {/* Passos de instalação */}
          <div className="space-y-3">
            <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Instalação — passo a passo
            </h2>
            <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card text-card-foreground">

              {/* Passo 1 */}
              <div className="flex items-start gap-4 bg-card px-5 py-4">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-border bg-muted text-xs font-semibold text-muted-foreground">
                  1
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-center gap-2">
                    <Download className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">Baixar a extensão</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Clique no botão &quot;Baixar extensão&quot; no topo desta página.
                    Um arquivo chamado <code className="rounded px-1 py-0.5 font-mono text-xs text-foreground bg-muted">lvx-licitacao-extensao.zip</code> vai
                    aparecer na pasta Downloads do seu computador.
                  </p>
                </div>
              </div>

              {/* Passo 2 */}
              <div className="flex items-start gap-4 bg-card px-5 py-4">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-border bg-muted text-xs font-semibold text-muted-foreground">
                  2
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-center gap-2">
                    <Chrome className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">Abrir o gerenciador de extensões</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Clique aqui para copiar o endereço:{' '}
                    <a
                      href="chrome://extensions"
                      onClick={(e) => {
                        e.preventDefault()
                        void navigator.clipboard.writeText('chrome://extensions')
                        alert('Endereço copiado! Cole na barra de endereço do Chrome e pressione Enter.')
                      }}
                      className="cursor-pointer font-medium text-foreground underline underline-offset-2"
                    >
                      chrome://extensions
                    </a>
                    {' '}— depois cole na barra de endereço do Chrome e pressione Enter.
                  </p>
                </div>
              </div>

              {/* Passo 3 */}
              <div className="flex items-start gap-4 bg-card px-5 py-4">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-border bg-muted text-xs font-semibold text-muted-foreground">
                  3
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-center gap-2">
                    <ToggleRight className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">Ativar o modo desenvolvedor</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Na página que abriu, procure no canto superior direito uma chave chamada
                    &quot;Modo do desenvolvedor&quot;. Clique nela para ativar — ela ficará destacada.
                    Se já estiver ativa, pode pular este passo.
                  </p>
                </div>
              </div>

              {/* Passo 4 */}
              <div className="flex items-start gap-4 bg-card px-5 py-4">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-border bg-muted text-xs font-semibold text-muted-foreground">
                  4
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">Instalar a extensão</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Abra a pasta Downloads no seu computador. Clique com o botão direito no
                    arquivo <code className="rounded px-1 py-0.5 font-mono text-xs text-foreground bg-muted">lvx-licitacao-extensao.zip</code> e
                    escolha &quot;Extrair aqui&quot;. Uma pasta vai aparecer. Volte para a
                    página de extensões do Chrome, clique em &quot;Carregar sem compactação&quot;
                    e selecione essa pasta que foi extraída.
                  </p>
                </div>
              </div>

            </div>

            <p className="pt-1 text-sm text-muted-foreground">
              Pronto! Agora role a página para baixo e clique em{' '}
              <strong className="text-foreground">Conectar extensão</strong>.
            </p>
          </div>

          {/* Seção de conexão */}
          <div className="space-y-3">
            <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Conexão
            </h2>

            {status === 'instalada' && (
              <div className="rounded-xl border border-border bg-muted px-5 py-4">
                <p className="text-sm font-semibold text-foreground">✓ Extensão encontrada!</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Clique no botão abaixo para conectar automaticamente ao{" "}
                  <span className="font-limvex font-medium uppercase text-foreground">LIMVEX</span>.
                  Você não precisa digitar nenhuma senha ou token.
                </p>
              </div>
            )}

            {status === 'nao_instalada' && (
              <div className="rounded-xl border border-border bg-muted px-5 py-4">
                <p className="text-sm font-semibold text-foreground">Extensão não encontrada</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Siga os 4 passos acima para instalar a extensão.
                  Depois clique no botão abaixo para tentar novamente.
                </p>
                <Button type="button" variant="outline" className="mt-3" onClick={() => window.location.reload()}>
                  Já instalei — verificar novamente
                </Button>
              </div>
            )}

            {status === 'conectada' && (
              <div className="rounded-xl border border-border bg-muted px-5 py-4">
                <p className="text-sm font-semibold text-foreground">✓ Extensão conectada com sucesso!</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tudo pronto. Agora vá para o Monitoramento para acompanhar os pregões ao vivo.
                </p>
                <Button type="button" variant="default" className="mt-3 shadow-none dark:hover:bg-[#e0e0e0]" onClick={() => router.push('/monitoramento')}>
                  Ir para Monitoramento →
                </Button>
              </div>
            )}

            {status === 'erro' && (
              <div className="flex items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-5 py-4">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-destructive" />
                <p className="text-sm text-destructive">{mensagemErro}</p>
              </div>
            )}

            {status !== 'conectada' && (
              <Button
                type="button"
                onClick={conectarExtensao}
                disabled={isDisabled}
                variant="secondary"
                className="h-auto w-full py-3 text-sm font-medium"
              >
                {isBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plug className="h-4 w-4" />
                )}
                {status === 'detectando'
                  ? 'Detectando extensão...'
                  : status === 'conectando'
                    ? 'Enviando token...'
                    : 'Conectar extensão'}
              </Button>
            )}
          </div>

        </div>
      </Layout>
    </AuthGuard>
  )
}
