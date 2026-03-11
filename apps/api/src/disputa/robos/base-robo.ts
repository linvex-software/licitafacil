import { Browser, Page, chromium } from "playwright";

export enum FaseSessao {
  AGUARDANDO = "AGUARDANDO",
  ABERTA = "ABERTA",
  ENCERRADA = "ENCERRADA",
  SUSPENSA = "SUSPENSA",
}

export abstract class BaseRobo {
  protected browser: Browser | null = null;
  protected page: Page | null = null;
  protected pausado = false;

  abstract login(cnpj: string, senha: string): Promise<void>;
  abstract navegarParaSessao(numeroEdital: string): Promise<void>;
  abstract detectarFaseSessao(): Promise<FaseSessao>;
  abstract enviarLance(valor: number, itemNumero: number): Promise<boolean>;
  abstract obterMelhorLance(itemNumero: number): Promise<number>;
  abstract obterPosicaoAtual(itemNumero: number): Promise<number>;
  abstract detectarCaptcha(): Promise<boolean>;
  abstract encerrar(): Promise<void>;

  async iniciarBrowser(): Promise<void> {
    this.browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });
    this.page = await this.browser.newPage();
  }

  pausar() {
    this.pausado = true;
  }

  retomar() {
    this.pausado = false;
  }

  estaAtivo() {
    return !this.pausado;
  }
}
