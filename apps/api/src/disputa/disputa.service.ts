import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface SimulacaoResultado {
  lanceSugerido: number;
  lanceMinimo: number;
  lanceAgressivo: number;
  economia: number;
  percentualEconomia: number;
}

export interface SalvarSimulacaoInput {
  valorInicial: number;
  percentualDesconto: number;
  numConcorrentes: number;
  lanceSugerido: number;
  lanceMinimo: number;
  lanceAgressivo: number;
}

@Injectable()
export class DisputaService {
  constructor(private readonly prisma: PrismaService) {}

  simularLance(
    valorInicial: number,
    percentualDesconto: number,
    numConcorrentes: number,
  ): SimulacaoResultado {
    const lanceMinimo = valorInicial * (1 - percentualDesconto / 100);
    const lanceConservador = valorInicial * (1 - (percentualDesconto / 100) * 1.5);
    const lanceAgressivo = valorInicial * (1 - (percentualDesconto / 100) * 2);

    // Mais concorrentes exigem uma sugestão mais agressiva.
    const fatorConcorrencia = 1 + (numConcorrentes - 1) * 0.01;
    const lanceSugerido = lanceConservador / fatorConcorrencia;

    return {
      lanceSugerido: Math.round(lanceSugerido * 100) / 100,
      lanceMinimo: Math.round(lanceMinimo * 100) / 100,
      lanceAgressivo: Math.round(lanceAgressivo * 100) / 100,
      economia: Math.round((valorInicial - lanceSugerido) * 100) / 100,
      percentualEconomia: Math.round((1 - lanceSugerido / valorInicial) * 10000) / 100,
    };
  }

  async salvarSimulacao(
    empresaId: string,
    bidId: string | undefined,
    dados: SalvarSimulacaoInput,
  ) {
    return this.prisma.simulacaoDisputa.create({
      data: {
        empresaId,
        bidId: bidId || null,
        valorInicial: dados.valorInicial,
        percentualDesconto: dados.percentualDesconto,
        numConcorrentes: dados.numConcorrentes,
        lanceSugerido: dados.lanceSugerido,
        lanceMinimo: dados.lanceMinimo,
        lanceAgressivo: dados.lanceAgressivo,
      },
    });
  }

  async getHistorico(empresaId: string, bidId: string) {
    return this.prisma.simulacaoDisputa.findMany({
      where: {
        empresaId,
        bidId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    });
  }
}
