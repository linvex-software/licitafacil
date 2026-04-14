import { Injectable } from "@nestjs/common";
import { ClienteStatus, PlanoTipo } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

interface CachedCliente {
  plano: PlanoTipo;
  status: ClienteStatus;
  fetchedAt: number;
}

const TTL_MS = 60_000;

@Injectable()
export class ClienteConfigCacheService {
  private readonly cache = new Map<string, CachedCliente>();

  constructor(private readonly prisma: PrismaService) {}

  invalidate(empresaId: string) {
    this.cache.delete(empresaId);
  }

  async getPlanAndStatus(empresaId: string): Promise<{ plano: PlanoTipo; status: ClienteStatus }> {
    const now = Date.now();
    const cached = this.cache.get(empresaId);
    if (cached && now - cached.fetchedAt <= TTL_MS) {
      return { plano: cached.plano, status: cached.status };
    }

    const config = await this.prisma.clienteConfig.findFirst({
      where: { empresaId, deletedAt: null },
      select: { plano: true, status: true },
    });

    const plano = config?.plano ?? PlanoTipo.STARTER;
    const status = config?.status ?? ClienteStatus.ATIVO;

    this.cache.set(empresaId, { plano, status, fetchedAt: now });
    return { plano, status };
  }
}

