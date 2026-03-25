let ws = null
let tentativaReconexao = null
let config = { apiUrl: 'wss://api.lvxlicitacao.com.br', jwt: '', disputaIdAtiva: '' }

async function carregarConfig() {
  const dados = await chrome.storage.local.get(['apiUrl', 'jwt', 'disputaIdAtiva'])
  if (dados.apiUrl) config.apiUrl = dados.apiUrl
  if (dados.jwt) config.jwt = dados.jwt
  if (dados.disputaIdAtiva) config.disputaIdAtiva = dados.disputaIdAtiva
}

function conectarWebSocket() {
  if (ws && ws.readyState === WebSocket.OPEN) return
  if (!config.jwt) {
    console.log('[LVX] JWT não configurado — aguardando configuração no popup')
    return
  }

  try {
    const base = config.apiUrl.replace(/\/$/, '')
    const url = `${base}/disputa-ws?token=${encodeURIComponent(config.jwt)}`
    ws = new WebSocket(url)

    ws.onopen = () => {
      console.log('[LVX] WebSocket conectado')
      chrome.storage.local.set({ status: 'conectado' })
      if (config.disputaIdAtiva) {
        ws.send(JSON.stringify({
          evento: 'extensao:join',
          dados: { disputaId: config.disputaIdAtiva },
        }))
      }
      if (tentativaReconexao) {
        clearTimeout(tentativaReconexao)
        tentativaReconexao = null
      }
    }

    ws.onmessage = (evento) => {
      try {
        const dados = JSON.parse(evento.data)

        if (dados.evento === 'extensao:preencher_lance') {
          const payload = dados.dados || {}
          const disputaId = payload.disputaId || config.disputaIdAtiva
          const itemNumero = Number(payload.itemNumero)
          const valor = Number(payload.valor)
          if (disputaId) config.disputaIdAtiva = disputaId

          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
              chrome.tabs.sendMessage(tabs[0].id, {
                tipo: 'PREENCHER_LANCE',
                valor
              }, (resposta) => {
                if (ws && ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({
                    evento: 'extensao:lance_confirmado',
                    dados: {
                      disputaId,
                      itemNumero,
                      valor,
                      sucesso: resposta?.sucesso ?? false,
                      erro: resposta?.erro,
                    },
                  }))
                }
              })
            }
          })
        }
      } catch (e) {
        console.error('[LVX] Erro ao processar mensagem WS:', e)
      }
    }

    ws.onclose = () => {
      console.log('[LVX] WebSocket desconectado — reconectando em 10s')
      chrome.storage.local.set({ status: 'desconectado' })
      ws = null
      tentativaReconexao = setTimeout(conectarWebSocket, 10000)
    }

    ws.onerror = (erro) => {
      console.error('[LVX] Erro WebSocket:', erro)
    }

  } catch (e) {
    console.error('[LVX] Falha ao conectar:', e)
    tentativaReconexao = setTimeout(conectarWebSocket, 10000)
  }
}

chrome.runtime.onMessage.addListener((mensagem, _sender, responder) => {
  if (mensagem.tipo === 'GET_STATUS') {
    const conectado = Boolean(ws && ws.readyState === WebSocket.OPEN)
    responder?.({
      sucesso: true,
      status: conectado ? 'conectado' : 'desconectado',
      disputaIdAtiva: config.disputaIdAtiva || null,
    })
    return true
  }

  if (mensagem.tipo === 'ATUALIZAR_DISPUTA_ATIVA') {
    const disputaIdAtiva = String(mensagem.disputaId || '').trim()
    if (disputaIdAtiva) {
      config.disputaIdAtiva = disputaIdAtiva
      chrome.storage.local.set({ disputaIdAtiva })
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          evento: 'extensao:join',
          dados: { disputaId: disputaIdAtiva },
        }))
      }
    }
    responder?.({ sucesso: true })
    return true
  }

  if (mensagem.tipo === 'SNAPSHOT') {
    if (ws && ws.readyState === WebSocket.OPEN) {
      const snapshot = mensagem.dados || {}
      ws.send(JSON.stringify({
        evento: 'extensao:snapshot',
        dados: {
          ...snapshot,
          disputaId: snapshot.disputaId || config.disputaIdAtiva,
          itens: Array.isArray(snapshot.itens)
            ? snapshot.itens.map((item, idx) => ({
                ...item,
                numeroItem: Number(item.numeroItem || item.itemNumero) || idx + 1,
              }))
            : [],
        },
      }))
    }
  }

  if (mensagem.tipo === 'SALVAR_CONFIG') {
    chrome.storage.local.set({ jwt: mensagem.jwt, apiUrl: mensagem.apiUrl }, () => {
      if (ws) ws.close()
      carregarConfig().then(conectarWebSocket)
      responder({ sucesso: true })
    })
    return true
  }
})

carregarConfig().then(conectarWebSocket)

chrome.storage.onChanged.addListener((changes) => {
  if (changes.jwt || changes.apiUrl || changes.disputaIdAtiva) {
    carregarConfig().then(() => {
      if (ws) ws.close()
      conectarWebSocket()
    })
  }
})
