async function atualizarStatus() {
  const dados = await chrome.storage.local.get(['status', 'apiUrl', 'jwt'])

  const dot = document.getElementById('dot')
  const texto = document.getElementById('statusText')

  if (dados.status === 'conectado') {
    dot.className = 'dot conectado'
    texto.textContent = 'Conectado ao Limvex'
  } else {
    dot.className = 'dot desconectado'
    texto.textContent = dados.jwt ? 'Desconectado — reconectando...' : 'Configure o JWT abaixo'
  }

  if (dados.apiUrl) document.getElementById('apiUrl').value = dados.apiUrl
  if (dados.jwt) document.getElementById('jwt').value = '••••••••'
}

document.getElementById('salvar').addEventListener('click', async () => {
  const apiUrl = document.getElementById('apiUrl').value.trim() || 'wss://api.licitacao.limvex.com'
  const jwtInput = document.getElementById('jwt').value.trim()

  const dados = { apiUrl }
  if (jwtInput && jwtInput !== '••••••••') dados.jwt = jwtInput

  await chrome.storage.local.set(dados)

  const saved = document.getElementById('saved')
  saved.style.display = 'block'
  setTimeout(() => saved.style.display = 'none', 2000)

  atualizarStatus()
})

atualizarStatus()
setInterval(atualizarStatus, 3000)
