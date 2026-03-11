import { BaseRobo, FaseSessao } from "../base-robo";
import { ComprasnetSelectors as Selectors } from "./comprasnet.selectors";

export class ComprasnetRobo extends BaseRobo {
  private readonly BASE_URL = "https://www.comprasnet.gov.br";

  private getPage() {
    if (!this.page) {
      throw new Error("Browser não inicializado para o robô ComprasNet");
    }
    return this.page;
  }

  async login(cnpj: string, senha: string): Promise<void> {
    const page = this.getPage();
    await page.goto(`${this.BASE_URL}/seguro/loginPortalFornecedor.asp`);
    await page.waitForLoadState("networkidle");
    await page.fill(Selectors.login.campoCnpj, cnpj.replace(/\D/g, ""));
    await page.fill(Selectors.login.campoSenha, senha);
    await page.click(Selectors.login.botaoEntrar);
    await page.waitForLoadState("networkidle");

    const erro = await page.$(Selectors.login.erroLogin);
    if (erro) {
      throw new Error("Credenciais inválidas no ComprasNet");
    }
  }

  async navegarParaSessao(numeroEdital: string): Promise<void> {
    const page = this.getPage();
    await page.goto(
      `${this.BASE_URL}/seguro/fornecedor/pregao/frmPregao.asp?numprp=${numeroEdital}`,
    );
    await page.waitForLoadState("networkidle");
  }

  async detectarFaseSessao(): Promise<FaseSessao> {
    const page = this.getPage();

    try {
      const texto = await page.textContent(Selectors.sessao.statusSessao);
      if (!texto) return FaseSessao.AGUARDANDO;

      const upper = texto.toUpperCase();
      if (upper.includes("ABERTA") || upper.includes("LANCES")) return FaseSessao.ABERTA;
      if (upper.includes("ENCERRADA") || upper.includes("FINALIZADA")) return FaseSessao.ENCERRADA;
      if (upper.includes("SUSPENSA")) return FaseSessao.SUSPENSA;

      return FaseSessao.AGUARDANDO;
    } catch {
      return FaseSessao.AGUARDANDO;
    }
  }

  async enviarLance(valor: number, _itemNumero: number): Promise<boolean> {
    const page = this.getPage();

    try {
      await page.fill(Selectors.sessao.campoValorLance, valor.toFixed(2));
      await page.click(Selectors.sessao.botaoEnviarLance);
      await page.waitForLoadState("networkidle");
      return true;
    } catch {
      return false;
    }
  }

  async obterMelhorLance(_itemNumero: number): Promise<number> {
    const page = this.getPage();
    const texto = await page.textContent(Selectors.sessao.melhorLance);
    if (!texto) return 0;
    return parseFloat(texto.replace(/[R$\s.]/g, "").replace(",", ".")) || 0;
  }

  async obterPosicaoAtual(_itemNumero: number): Promise<number> {
    const page = this.getPage();
    const texto = await page.textContent(Selectors.sessao.posicaoAtual);
    return parseInt(texto?.match(/\d+/)?.[0] ?? "99", 10) || 99;
  }

  async detectarCaptcha(): Promise<boolean> {
    const page = this.getPage();
    const captcha = await page.$(Selectors.sessao.captcha);
    return !!captcha;
  }

  async obterTempoRestante(): Promise<number> {
    const page = this.getPage();
    try {
      const texto = await page.textContent(Selectors.sessao.countdown);
      if (!texto) return 999;

      const partes = texto.match(/(\d+):(\d+)/);
      if (!partes) return 999;

      return parseInt(partes[1], 10) * 60 + parseInt(partes[2], 10);
    } catch {
      return 999;
    }
  }

  async encerrar(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
    this.browser = null;
    this.page = null;
  }
}
