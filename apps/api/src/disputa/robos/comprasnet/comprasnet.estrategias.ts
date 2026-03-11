import { ConfiguracaoLance, EstrategiaLance } from "@prisma/client";

function toNumber(valor: ConfiguracaoLance["valorMinimo"]): number {
  return Number(valor);
}

export interface EstrategiaCalculadora {
  calcularProximoLance(
    melhorLance: number,
    posicaoAtual: number,
    config: ConfiguracaoLance,
    tempoRestante?: number,
  ): number | null;
}

export class EstrategiaAgressiva implements EstrategiaCalculadora {
  calcularProximoLance(
    melhorLance: number,
    posicaoAtual: number,
    config: ConfiguracaoLance,
  ): number | null {
    if (posicaoAtual === 1) return null;
    const proximo = melhorLance - 0.01;
    if (proximo < toNumber(config.valorMinimo)) return null;
    return proximo;
  }
}

export class EstrategiaConservadora implements EstrategiaCalculadora {
  calcularProximoLance(
    melhorLance: number,
    posicaoAtual: number,
    config: ConfiguracaoLance,
    tempoRestante = 999,
  ): number | null {
    if (posicaoAtual === 1) return null;
    if (tempoRestante > 30) return null;
    const proximo = melhorLance - 0.01;
    if (proximo < toNumber(config.valorMinimo)) return null;
    return proximo;
  }
}

export class EstrategiaPorMargem implements EstrategiaCalculadora {
  calcularProximoLance(
    melhorLance: number,
    posicaoAtual: number,
    config: ConfiguracaoLance,
  ): number | null {
    if (posicaoAtual === 1) return null;
    const proximo = melhorLance - 0.01;
    if (proximo < toNumber(config.valorMinimo)) return null;
    return proximo;
  }
}

export function selecionarEstrategia(estrategia: EstrategiaLance): EstrategiaCalculadora {
  switch (estrategia) {
    case EstrategiaLance.AGRESSIVA:
      return new EstrategiaAgressiva();
    case EstrategiaLance.CONSERVADORA:
      return new EstrategiaConservadora();
    case EstrategiaLance.POR_MARGEM:
      return new EstrategiaPorMargem();
    default:
      return new EstrategiaConservadora();
  }
}
