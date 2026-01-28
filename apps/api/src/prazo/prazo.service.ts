import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaTenantService } from "../prisma/prisma-tenant.service";
import {
  type CreatePrazoInput,
  type UpdatePrazoInput,
  type Prazo,
} from "@licitafacil/shared";
import { BidService } from "../bid/bid.service";

export interface ListPrazosFilters {
  empresaId: string;
  bidId: string;
}

export interface PrazoWithDaysRemaining extends Prazo {
  diasRestantes: number | null; // null se data no passado (já venceu), número de dias até a data
}

@Injectable()
export class PrazoService {
  constructor(
    private readonly prismaTenant: PrismaTenantService,
    private readonly bidService: BidService,
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

    return this.mapToPrazo(item);
  }

  /**
   * Lista todos os prazos de uma licitação, ordenados por data.
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

    return items.map((item) => ({
      ...this.mapToPrazo(item),
      diasRestantes: PrazoService.calcularDiasRestantes(item.dataPrazo),
    }));
  }

  /**
   * Busca um prazo por ID (com filtro de tenant).
   */
  async findOne(id: string, empresaId: string): Promise<PrazoWithDaysRemaining> {
    const prismaWithTenant = this.prismaTenant.forTenant(empresaId);
    const item = await prismaWithTenant.prazo.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException(`Prazo com ID ${id} não encontrado`);
    }

    return {
      ...this.mapToPrazo(item),
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

    return this.mapToPrazo(updated);
  }

  private mapToPrazo(item: {
    id: string;
    empresaId: string;
    bidId: string;
    titulo: string;
    dataPrazo: Date;
    descricao: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): Prazo {
    return {
      id: item.id,
      empresaId: item.empresaId,
      bidId: item.bidId,
      titulo: item.titulo,
      dataPrazo: item.dataPrazo.toISOString(),
      descricao: item.descricao,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}
