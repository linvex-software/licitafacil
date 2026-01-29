import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaTenantService } from "../prisma/prisma-tenant.service";
import {
  type CreatePrazoInput,
  type UpdatePrazoInput,
  type Prazo,
} from "@licitafacil/shared";
import { BidService } from "../bid/bid.service";
import { PrazoCriticalityService } from "./prazo-criticality.service";

export interface ListPrazosFilters {
  empresaId: string;
  bidId: string;
}

export interface PrazoWithDaysRemaining extends Prazo {
  diasRestantes: number | null; // null se data no passado (já venceu), número de dias até a data
}

export interface PrazoUpcomingItem extends PrazoWithDaysRemaining {
  bidTitle?: string | null;
}

@Injectable()
export class PrazoService {
  constructor(
    private readonly prismaTenant: PrismaTenantService,
    private readonly bidService: BidService,
    private readonly criticalityService: PrazoCriticalityService,
  ) {}

  /**
   * Calcula dias restantes até a data do prazo (considerando apenas a data, não hora).
   * Retorna negativo se a data já passou.
   */
  static calcularDiasRestantes(dataPrazo: Date): number {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const data = new Date(dataPrazo);
    data.setHours(0, 0, 0, 0);
    const diffMs = data.getTime() - hoje.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Cria um novo prazo para uma licitação.
   * Valida que a licitação existe e pertence ao tenant.
   */
  async create(data: CreatePrazoInput, empresaId: string): Promise<Prazo> {
    const prismaWithTenant = this.prismaTenant.forTenant(empresaId);

    await this.bidService.findOne(data.bidId, empresaId);

    const item = await prismaWithTenant.prazo.create({
      data: {
        empresaId,
        bidId: data.bidId,
        titulo: data.titulo,
        dataPrazo: new Date(data.dataPrazo),
        descricao: data.descricao ?? null,
      },
    });

    // Analisar criticidade do novo prazo
    const criticality = await this.criticalityService.analyzeCriticality({
      prazoId: item.id,
      dataPrazo: item.dataPrazo,
      bidId: item.bidId,
      empresaId,
    });

    return this.mapToPrazo(item, criticality.isCritical, criticality.criticalReason);
  }

  /**
   * Lista todos os prazos de uma licitação, ordenados por data.
   * Inclui análise de criticidade para cada prazo.
   */
  async findAll(filters: ListPrazosFilters): Promise<PrazoWithDaysRemaining[]> {
    const prismaWithTenant = this.prismaTenant.forTenant(filters.empresaId);

    await this.bidService.findOne(filters.bidId, filters.empresaId);

    const items = await prismaWithTenant.prazo.findMany({
      where: {
        empresaId: filters.empresaId,
        bidId: filters.bidId,
      },
      orderBy: {
        dataPrazo: "asc",
      },
    });

    // Analisar criticidade de todos os prazos de uma vez (otimizado)
    const criticalityMap = await this.criticalityService.analyzeMultipleCriticality(
      items.map((item) => ({
        id: item.id,
        dataPrazo: item.dataPrazo,
        bidId: item.bidId,
      })),
      filters.empresaId,
    );

    return items.map((item) => {
      const criticality = criticalityMap.get(item.id) || {
        isCritical: false,
        criticalReason: null,
      };

      return {
        ...this.mapToPrazo(item, criticality.isCritical, criticality.criticalReason),
        diasRestantes: PrazoService.calcularDiasRestantes(item.dataPrazo),
      };
    });
  }

  /**
   * Lista próximos prazos da empresa (para dashboard), ordenados por data.
   * Não exige bidId; retorna prazos de todas as licitações do tenant.
   */
  async findUpcoming(empresaId: string, limit: number = 10): Promise<PrazoUpcomingItem[]> {
    const prismaWithTenant = this.prismaTenant.forTenant(empresaId);

    const items = await prismaWithTenant.prazo.findMany({
      where: {
        empresaId,
        deletedAt: null,
      },
      orderBy: { dataPrazo: "asc" },
      take: limit,
      include: { bid: { select: { id: true, title: true } } },
    });

    const criticalityMap = await this.criticalityService.analyzeMultipleCriticality(
      items.map((item) => ({
        id: item.id,
        dataPrazo: item.dataPrazo,
        bidId: item.bidId,
      })),
      empresaId,
    );

    return items.map((item) => {
      const criticality = criticalityMap.get(item.id) || {
        isCritical: false,
        criticalReason: null,
      };
      return {
        ...this.mapToPrazo(item, criticality.isCritical, criticality.criticalReason),
        diasRestantes: PrazoService.calcularDiasRestantes(item.dataPrazo),
        bidTitle: item.bid?.title ?? null,
      };
    });
  }

  /**
   * Busca um prazo por ID (com filtro de tenant).
   * Inclui análise de criticidade.
   */
  async findOne(id: string, empresaId: string): Promise<PrazoWithDaysRemaining> {
    const prismaWithTenant = this.prismaTenant.forTenant(empresaId);
    const item = await prismaWithTenant.prazo.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException(`Prazo com ID ${id} não encontrado`);
    }

    // Analisar criticidade
    const criticality = await this.criticalityService.analyzeCriticality({
      prazoId: item.id,
      dataPrazo: item.dataPrazo,
      bidId: item.bidId,
      empresaId,
    });

    return {
      ...this.mapToPrazo(item, criticality.isCritical, criticality.criticalReason),
      diasRestantes: PrazoService.calcularDiasRestantes(item.dataPrazo),
    };
  }

  /**
   * Atualiza um prazo.
   */
  async update(id: string, data: UpdatePrazoInput, empresaId: string): Promise<Prazo> {
    const prismaWithTenant = this.prismaTenant.forTenant(empresaId);

    const existing = await prismaWithTenant.prazo.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Prazo com ID ${id} não encontrado`);
    }

    const updated = await prismaWithTenant.prazo.update({
      where: { id },
      data: {
        ...(data.titulo !== undefined && { titulo: data.titulo }),
        ...(data.dataPrazo !== undefined && { dataPrazo: new Date(data.dataPrazo) }),
        ...(data.descricao !== undefined && { descricao: data.descricao }),
      },
    });

    // Reanalisar criticidade após atualização
    const criticality = await this.criticalityService.analyzeCriticality({
      prazoId: updated.id,
      dataPrazo: updated.dataPrazo,
      bidId: updated.bidId,
      empresaId,
    });

    return this.mapToPrazo(updated, criticality.isCritical, criticality.criticalReason);
  }

  private mapToPrazo(
    item: {
      id: string;
      empresaId: string;
      bidId: string;
      titulo: string;
      dataPrazo: Date;
      descricao: string | null;
      createdAt: Date;
      updatedAt: Date;
    },
    isCritical: boolean = false,
    criticalReason: string | null = null,
  ): Prazo {
    return {
      id: item.id,
      empresaId: item.empresaId,
      bidId: item.bidId,
      titulo: item.titulo,
      dataPrazo: item.dataPrazo.toISOString(),
      descricao: item.descricao,
      isCritical,
      criticalReason: criticalReason as any,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}
