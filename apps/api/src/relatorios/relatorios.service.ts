import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { FiltroRelatorioDto } from "./dto/filtro-relatorio.dto";
import { RelatorioResponseDto } from "./dto/relatorio-response.dto";

@Injectable()
export class RelatoriosService {
  constructor(private prisma: PrismaService) {}

  private calcularPeriodo(filtro: FiltroRelatorioDto): {
    inicio: Date;
    fim: Date;
    label: string;
  } {
    const agora = new Date();
    let inicio: Date;
    let fim = new Date();
    let label: string;

    switch (filtro.periodo) {
      case "mes":
        inicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
        label = agora.toLocaleDateString("pt-BR", {
          month: "long",
          year: "numeric",
        });
        break;
      case "trimestre": {
        const trimestre = Math.floor(agora.getMonth() / 3);
        inicio = new Date(agora.getFullYear(), trimestre * 3, 1);
        label = `${trimestre + 1}º Trimestre ${agora.getFullYear()}`;
        break;
      }
      case "ano":
        inicio = new Date(agora.getFullYear(), 0, 1);
        label = `Ano ${agora.getFullYear()}`;
        break;
      case "custom":
        inicio = new Date(filtro.dataInicio!);
        fim = new Date(filtro.dataFim!);
        label = `${new Date(filtro.dataInicio!).toLocaleDateString("pt-BR")} - ${new Date(filtro.dataFim!).toLocaleDateString("pt-BR")}`;
        break;
      default:
        inicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
        label = "Este mês";
    }

    return { inicio, fim, label };
  }

  async gerarDados(
    empresaId: string,
    filtro: FiltroRelatorioDto,
  ): Promise<RelatorioResponseDto> {
    const { inicio, fim, label } = this.calcularPeriodo(filtro);

    // Buscar licitações filtradas
    const where: any = {
      empresaId,
      deletedAt: null,
      createdAt: { gte: inicio, lte: fim },
    };

    if (filtro.status && filtro.status.length > 0) {
      where.legalStatus = { in: filtro.status };
    }

    if (filtro.modalidades && filtro.modalidades.length > 0) {
      where.modality = { in: filtro.modalidades };
    }

    if (filtro.orgao) {
      where.agency = { contains: filtro.orgao, mode: "insensitive" };
    }

    const licitacoes = await this.prisma.bid.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    // Calcular métricas
    const total = licitacoes.length;
    const ganhas = licitacoes.filter(
      (l) => l.legalStatus === "VENCIDA",
    ).length;
    const perdidas = licitacoes.filter(
      (l) =>
        l.legalStatus === "PERDIDA" || l.legalStatus === "DESCARTADA",
    ).length;
    const emAndamento = licitacoes.filter(
      (l) =>
        l.legalStatus === "PARTICIPANDO" ||
        l.legalStatus === "ANALISANDO",
    ).length;
    const taxaSucesso =
      total > 0 ? Math.round((ganhas / total) * 100) : 0;

    // Distribuição por status
    const statusMap = new Map<string, number>();
    licitacoes.forEach((l) => {
      statusMap.set(
        l.legalStatus,
        (statusMap.get(l.legalStatus) || 0) + 1,
      );
    });
    const distribuicaoStatus = Array.from(statusMap.entries()).map(
      ([status, quantidade]) => ({
        status,
        quantidade,
        percentual:
          total > 0 ? Math.round((quantidade / total) * 100) : 0,
      }),
    );

    // Distribuição por modalidade
    const modalidadeMap = new Map<string, number>();
    licitacoes.forEach((l) => {
      modalidadeMap.set(
        l.modality,
        (modalidadeMap.get(l.modality) || 0) + 1,
      );
    });
    const distribuicaoModalidade = Array.from(
      modalidadeMap.entries(),
    ).map(([modalidade, quantidade]) => ({
      modalidade,
      quantidade,
      percentual:
        total > 0 ? Math.round((quantidade / total) * 100) : 0,
    }));

    // Timeline por mês
    const timelineMap = new Map<
      string,
      { total: number; ganhas: number; perdidas: number }
    >();
    licitacoes.forEach((l) => {
      const mes = new Date(l.createdAt).toLocaleDateString("pt-BR", {
        month: "short",
        year: "2-digit",
      });
      const atual = timelineMap.get(mes) || {
        total: 0,
        ganhas: 0,
        perdidas: 0,
      };
      atual.total++;
      if (l.legalStatus === "VENCIDA") atual.ganhas++;
      if (l.legalStatus === "PERDIDA") atual.perdidas++;
      timelineMap.set(mes, atual);
    });
    const timeline = Array.from(timelineMap.entries()).map(
      ([mes, dados]) => ({
        mes,
        ...dados,
      }),
    );

    return {
      periodo: {
        inicio: inicio.toISOString(),
        fim: fim.toISOString(),
        label,
      },
      metricas: {
        total,
        ganhas,
        perdidas,
        emAndamento,
        taxaSucesso,
      },
      distribuicaoStatus,
      distribuicaoModalidade,
      timeline,
      licitacoes: licitacoes.map((l) => ({
        id: l.id,
        titulo: l.title,
        modalidade: l.modality,
        orgao: l.agency,
        status: l.legalStatus,
        dataCriacao: new Date(l.createdAt).toLocaleDateString("pt-BR"),
      })),
    };
  }
}
