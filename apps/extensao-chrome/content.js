// Sinalizar presença para a página (detectado via document.getElementById)
const marker = document.createElement('div')
marker.id = 'lvx-extensao-presente'
marker.style.display = 'none'
document.head.appendChild(marker)

const SELETORES = {
  melhorLance: [
    '[class*="melhor-lance"]',
    '[class*="melhorLance"]',
    '[class*="valor-lance"]',
    'table td:nth-child(2)',
    '[data-testid*="lance"]'
  ],
  inputLance: [
    'input[name*="lance"]',
    'input[id*="lance"]',
    'input[name*="valor"]',
    'input[placeholder*="lance"]',
    'input[type="number"]'
  ],
  posicao: [
    '[class*="posicao"]',
    '[class*="colocacao"]',
    '[class*="classificacao"]'
  ],
  itens: [
    '[class*="item-disputa"]',
    '[class*="itemDisputa"]',
    'table tbody tr'
  ],
  chat: [
    '[class*="mensagem"]',
    '[class*="chat"]',
    '[class*="aviso"]'
  ],
  statusItem: [
    '[class*="status"]',
    '[class*="situacao"]'
  ]
}

function tentarSeletores(lista) {
  for (const seletor of lista) {
    const el = document.querySelector(seletor)
    if (el) return el
  }
  return null
}

function tentarSeletoresTodos(lista) {
  for (const seletor of lista) {
    const els = document.querySelectorAll(seletor)
    if (els.length > 0) return Array.from(els)
  }
  return []
}

function lerValorMonetario(el) {
  if (!el) return null
  const texto = el.innerText || el.textContent || ''
  const match = texto.match(/[\d.,]+/)
  if (!match) return null
  return parseFloat(match[0].replace(/\./g, '').replace(',', '.'))
}

function montarSnapshot() {
  const itensEls = tentarSeletoresTodos(SELETORES.itens)
  const chatEls = tentarSeletoresTodos(SELETORES.chat)
  const inputLance = tentarSeletores(SELETORES.inputLance)

  const itens = itensEls.slice(0, 20).map((el, idx) => ({
    id: el.getAttribute('data-id') || el.id || `item-${idx}`,
    descricao: el.querySelector('td, [class*="descricao"]')?.innerText?.trim() || '',
    melhorLance: lerValorMonetario(el.querySelector(SELETORES.melhorLance.join(','))),
    posicaoAtual: null,
    status: el.innerText?.toLowerCase().includes('encerr') ? 'ENCERRADO' :
            el.innerText?.toLowerCase().includes('aberto') ? 'ABERTO' : 'AGUARDANDO'
  }))

  const mensagens = chatEls.slice(-5).map(el => el.innerText?.trim()).filter(Boolean)

  return {
    timestamp: Date.now(),
    urlPortal: window.location.href,
    temInputLance: !!inputLance,
    itens,
    mensagensChat: mensagens,
    htmlDebug: document.title
  }
}

// Responder ao ping do Limvex (para detecção e configuração remota de JWT)
window.addEventListener('message', (event) => {
  // Em produção: if (event.origin !== 'https://lvxlicitacao.com.br') return
  if (!event.data || typeof event.data !== 'object') return

  if (event.data.tipo === 'LVX_PING') {
    window.postMessage({ tipo: 'LVX_EXTENSAO_PRESENTE' }, '*')
  }

  if (event.data.tipo === 'LVX_CONFIGURAR_JWT') {
    const { jwt, apiUrl } = event.data
    chrome.runtime.sendMessage({ tipo: 'SALVAR_CONFIG', jwt, apiUrl }, () => {
      window.postMessage({ tipo: 'LVX_JWT_SALVO' }, '*')
    })
  }
})

let intervalo = null

function iniciarPolling() {
  if (intervalo) return
  intervalo = setInterval(() => {
    const snapshot = montarSnapshot()
    chrome.runtime.sendMessage({ tipo: 'SNAPSHOT', dados: snapshot })
  }, 5000)
}

chrome.runtime.onMessage.addListener((mensagem, sender, responder) => {
  if (mensagem.tipo === 'PREENCHER_LANCE') {
    const { valor } = mensagem
    const campo = tentarSeletores(SELETORES.inputLance)

    if (!campo) {
      responder({ sucesso: false, erro: 'Campo de lance não encontrado na página' })
      return true
    }

    try {
      campo.focus()

      const nativeInputSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, 'value'
      )?.set

      if (nativeInputSetter) {
        nativeInputSetter.call(campo, valor)
      } else {
        campo.value = valor
      }

      campo.dispatchEvent(new Event('input', { bubbles: true }))
      campo.dispatchEvent(new Event('change', { bubbles: true }))
      campo.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }))

      responder({ sucesso: true, valorDefinido: campo.value })
    } catch (erro) {
      responder({ sucesso: false, erro: erro.message })
    }
    return true
  }
})

iniciarPolling()
