export const ComprasnetSelectors = {
  login: {
    campoCnpj: 'input[name="username"], input[id*="cnpj"], input[id*="login"]',
    campoSenha: 'input[type="password"]',
    botaoEntrar: 'button[type="submit"], input[type="submit"]',
    erroLogin: '.erro, .alert-danger, [class*="error"]',
  },
  sessao: {
    statusSessao: '[id*="situacao"], [class*="situacao"], [id*="status"]',
    tabelaLances: '[id*="lances"], table[class*="lance"]',
    melhorLance: '[id*="melhorLance"], [id*="menor-lance"], [class*="melhor"]',
    posicaoAtual: '[id*="posicao"], [class*="posicao"]',
    campoValorLance: 'input[id*="valorLance"], input[name*="lance"]',
    botaoEnviarLance: 'button[id*="enviarLance"], button[class*="lance"]',
    captcha: 'iframe[src*="recaptcha"], [class*="captcha"]',
    faseAberta: '[id*="fase"][value*="ABERTA"], [class*="fase-aberta"]',
    countdown: '[id*="countdown"], [class*="tempo"]',
  },
};
