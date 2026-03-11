import { ConfiguracaoLance } from "@prisma/client";
import { BaseRobo, FaseSessao } from "./base-robo";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface MockItemState {
  itemId: string;
  valorAtual: number;
  valorMinimo: number;
  valorMaximo: number;
  posicaoAtual: 1 | 2;
  meuUltimoLance: number;
}

export class MockRobo extends BaseRobo {
  private readonly inicioMs = Date.now();
  private readonly itens = new Map<number, MockItemState>();

  configurarItens(configuracoes: ConfiguracaoLance[]) {
    this.itens.clear();
    for (const config of configuracoes) {
      const valorBase = 5000;
      this.itens.set(config.itemNumero, {
        itemId: String(config.itemNumero),
        valorAtual: valorBase,
        valorMinimo: Number(config.valorMinimo),
        valorMaximo: Number(config.valorMaximo),
        posicaoAtual: 1,
        meuUltimoLance: valorBase,
      });
    }
  }

  listarItens() {
    return Array.from(this.itens.entries()).map(([itemNumero, state]) => ({
      itemNumero,
      itemId: state.itemId,
    }));
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

    return item.posicaoAtual === 1
      ? Number(item.meuUltimoLance.toFixed(2))
      : Number((item.meuUltimoLance - 50).toFixed(2));
  }

  async obterPosicaoAtual(itemNumero: number): Promise<number> {
    const item = this.itens.get(itemNumero);
    return item?.posicaoAtual ?? 2;
  }

  reduzirLance(itemNumero: number) {
    const item = this.itens.get(itemNumero);
    if (!item) {
      return null;
    }

    const decremento = 50 + Math.floor(Math.random() * 101);
    const piso = Math.max(0, item.valorMinimo);
    item.valorAtual = Math.max(piso, item.valorAtual - decremento);
    item.meuUltimoLance = Number(item.valorAtual.toFixed(2));

    const melhorLance =
      item.posicaoAtual === 1
        ? item.meuUltimoLance
        : Number((item.meuUltimoLance - 50).toFixed(2));

    return {
      itemId: item.itemId,
      meuUltimoLance: item.meuUltimoLance,
      melhorLance,
      posicao: item.posicaoAtual,
    };
  }

  alternarPosicao(itemNumero: number) {
    const item = this.itens.get(itemNumero);
    if (!item) {
      return null;
    }

    item.posicaoAtual = item.posicaoAtual === 1 ? 2 : 1;
    const melhorLance =
      item.posicaoAtual === 1
        ? item.meuUltimoLance
        : Number((item.meuUltimoLance - 50).toFixed(2));

    return {
      itemId: item.itemId,
      posicao: item.posicaoAtual,
      meuUltimoLance: item.meuUltimoLance,
      melhorLance,
    };
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
