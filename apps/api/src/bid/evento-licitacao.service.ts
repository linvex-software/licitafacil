import { Injectable } from "@nestjs/common";
import { Prisma, TipoEventoLicitacao } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class EventoLicitacaoService {
  constructor(private readonly prisma: PrismaService) {}

  async registrar(
    bidId: string,
    tipo: TipoEventoLicitacao,
    detalhes?: Record<string, unknown>,
    criadoPor?: string,
  ) {
    return this.prisma.eventoLicitacao.create({
      data: {
        bidId,
        tipo,
        detalhes: detalhes as Prisma.InputJsonValue | undefined,
        criadoPor,
      },
    });
  }

  async listarPorBid(bidId: string) {
    return this.prisma.eventoLicitacao.findMany({
      where: { bidId },
      orderBy: { timestamp: "asc" },
    });
  }

  async verificarJanelaRecurso(bidId: string): Promise<boolean> {
    const bid = await this.prisma.bid.findUnique({
      where: { id: bidId },
      select: { janelaIntencaoRecursoTermino: true },
    });
    if (!bid?.janelaIntencaoRecursoTermino) return false;
    return new Date() < bid.janelaIntencaoRecursoTermino;
  }
}
