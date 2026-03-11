import { ConfiguracaoLance } from "@prisma/client";
import { BaseRobo, FaseSessao } from "./base-robo";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface MockItemState {
  valorAtual: number;
  valorMinimo: number;
  valorMaximo: number;
}

export class MockRobo extends BaseRobo {
  private readonly inicioMs = Date.now();
  private readonly itens = new Map<number, MockItemState>();

  configurarItens(configuracoes: ConfiguracaoLance[]) {
    this.itens.clear();
    for (const config of configuracoes) {
      this.itens.set(config.itemNumero, {
        valorAtual: Number(config.valorMaximo),
        valorMinimo: Number(config.valorMinimo),
        valorMaximo: Number(config.valorMaximo),
      });
    }
  }

  async iniciarBrowser(): Promise<void> {
    return;
  }

  async login(_cnpj: string, _senha: string): Promise<void> {
    await sleep(1000);
  }

  async navegarParaSessao(_numeroEdital: string): Promise<void> {
    await sleep(1000);
  }

  async detectarFaseSessao(): Promise<FaseSessao> {
    const elapsed = (Date.now() - this.inicioMs) / 1000;
    if (elapsed < 5) return FaseSessao.AGUARDANDO;
    if (elapsed < 65) return FaseSessao.ABERTA;
    return FaseSessao.ENCERRADA;
  }

  async enviarLance(_valor: number, _itemNumero: number): Promise<boolean> {
    await sleep(500);
    return true;
  }

  async obterMelhorLance(itemNumero: number): Promise<number> {
    const item = this.itens.get(itemNumero);
    if (!item) {
      const base = 1000 - Math.random() * 100;
      return Number(base.toFixed(2));
    }

    const decremento = Number((0.01 + Math.random() * 2).toFixed(2));
    item.valorAtual = Math.max(item.valorMinimo, item.valorAtual - decremento);
    const faixa = Math.max(0, item.valorAtual - item.valorMinimo);
    const oscilacao = Math.min(0.5, faixa);
    const valor = Math.max(item.valorMinimo, item.valorAtual - Math.random() * oscilacao);
    return Number(valor.toFixed(2));
  }

  async obterPosicaoAtual(_itemNumero: number): Promise<number> {
    return Math.floor(Math.random() * 5) + 1;
  }

  async obterTempoRestante(): Promise<number> {
    const elapsed = Math.floor((Date.now() - this.inicioMs) / 1000);
    const restante = 60 - Math.max(0, elapsed - 5);
    return Math.max(0, restante);
  }

  async detectarCaptcha(): Promise<boolean> {
    return false;
  }

  async encerrar(): Promise<void> {
    return;
  }
}
