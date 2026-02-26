import { Injectable } from "@nestjs/common";
import { PrismaTenantService } from "../prisma/prisma-tenant.service";

export interface EventoAgendaItem {
  id: string;
  data: string;
  tipo: "PRAZO";
  titulo: string;
  bidId: string;
  bid: {
    numero: string;
    orgao: string;
  };
  diasRestantes: number;
}

export interface EventoAgendaResponse {
  eventos: EventoAgendaItem[];
  message?: string;
}

@Injectable()
export class NegociosService {
  constructor(private readonly prismaTenant: PrismaTenantService) {}

  async getEventosMes(empresaId: string, mes: string): Promise<EventoAgendaResponse> {
    const intervalo = this.parseMes(mes);
    if (!intervalo) {
      return {
        eventos: [],
        message: "Mes invalido. Use o formato YYYY-MM.",
      };
    }

    const prismaWithTenant = this.prismaTenant.forTenant(empresaId);
    const prazos = await prismaWithTenant.prazo.findMany({
      where: {
        dataPrazo: {
          gte: intervalo.inicio,
          lte: intervalo.fim,
        },
      },
      include: {
        bid: {
          select: {
            title: true,
            agency: true,
          },
        },
      },
      orderBy: {
        dataPrazo: "asc",
      },
    });

    return {
      eventos: prazos.map((prazo) => ({
        id: prazo.id,
        data: prazo.dataPrazo.toISOString(),
        tipo: "PRAZO",
        titulo: prazo.titulo,
        bidId: prazo.bidId,
        bid: {
          numero: prazo.bid?.title ?? "Sem numero",
          orgao: prazo.bid?.agency ?? "Orgao nao informado",
        },
        diasRestantes: this.calcularDiasRestantes(prazo.dataPrazo),
      })),
    };
  }

  private parseMes(mes: string): { inicio: Date; fim: Date } | null {
    const formatoValido = /^\d{4}-(0[1-9]|1[0-2])$/.test(mes);
    if (!formatoValido) return null;

    const [ano, mesNum] = mes.split("-").map(Number);
    const inicio = new Date(Date.UTC(ano, mesNum - 1, 1, 0, 0, 0, 0));
    const fim = new Date(Date.UTC(ano, mesNum, 0, 23, 59, 59, 999));

    return { inicio, fim };
  }

  private calcularDiasRestantes(dataPrazo: Date): number {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const data = new Date(dataPrazo);
    data.setHours(0, 0, 0, 0);

    const diffMs = data.getTime() - hoje.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }
}
