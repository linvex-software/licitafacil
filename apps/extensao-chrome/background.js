let ws = null
let tentativaReconexao = null
let config = { apiUrl: 'wss://api.lvxlicitacao.com.br', jwt: '' }

async function carregarConfig() {
  const dados = await chrome.storage.local.get(['apiUrl', 'jwt'])
  if (dados.apiUrl) config.apiUrl = dados.apiUrl
  if (dados.jwt) config.jwt = dados.jwt
}

function conectarWebSocket() {
  if (ws && ws.readyState === WebSocket.OPEN) return
  if (!config.jwt) {
    console.log('[LVX] JWT não configurado — aguardando configuração no popup')
    return
  }

  try {
    const url = `${config.apiUrl}/disputa?token=${encodeURIComponent(config.jwt)}`
    ws = new WebSocket(url)

    ws.onopen = () => {
      console.log('[LVX] WebSocket conectado')
      chrome.storage.local.set({ status: 'conectado' })
      if (tentativaReconexao) {
        clearTimeout(tentativaReconexao)
        tentativaReconexao = null
      }
    }

    ws.onmessage = (evento) => {
      try {
        const dados = JSON.parse(evento.data)

        if (dados.evento === 'extensao:preencher_lance') {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
              chrome.tabs.sendMessage(tabs[0].id, {
                tipo: 'PREENCHER_LANCE',
                valor: dados.dados.valor
              }, (resposta) => {
                if (ws && ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({
                    evento: 'extensao:lance_confirmado',
                    dados: resposta || { sucesso: false, erro: 'Sem resposta do content script' }
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
  if (mensagem.tipo === 'SNAPSHOT') {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        evento: 'extensao:snapshot',
        dados: mensagem.dados
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
  if (changes.jwt || changes.apiUrl) {
    carregarConfig().then(() => {
      if (ws) ws.close()
      conectarWebSocket()
    })
  }
})
