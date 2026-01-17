import { Injectable } from "@nestjs/common";
import { PrismaTenantService } from "../prisma/prisma-tenant.service";

/**
 * DTO para criar um log de auditoria
 */
export interface CreateAuditLogInput {
  empresaId: string;
  userId?: string | null;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, any> | null;
  ip?: string | null;
  userAgent?: string | null;
}

/**
 * DTO para filtrar logs de auditoria
 */
export interface ListAuditLogsFilters {
  empresaId: string;
  userId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

/**
 * Serviço de auditoria
 * 
 * IMPORTANTE: Logs são imutáveis. Este serviço NÃO possui métodos de update ou delete.
 * Apenas inserção (record) e leitura (list) são permitidas.
 */
@Injectable()
export class AuditLogService {
  constructor(
    private readonly prismaTenant: PrismaTenantService,
  ) {}

  /**
   * Registra um novo log de auditoria
   * 
   * @param input Dados do log de auditoria
   * @returns ID do log criado
   */
  async record(input: CreateAuditLogInput): Promise<string> {
    const prismaWithTenant = this.prismaTenant.forTenant(input.empresaId);

    const auditLog = await prismaWithTenant.auditLog.create({
      data: {
        empresaId: input.empresaId,
        userId: input.userId ?? null,
        action: input.action,
        resourceType: input.resourceType ?? null,
        resourceId: input.resourceId ?? null,
        metadata: input.metadata ? (input.metadata as any) : null,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
      },
    });

    return auditLog.id;
  }

  /**
   * Lista logs de auditoria com filtros e paginação
   * 
   * IMPORTANTE: Apenas leitura. Sem métodos de update/delete.
   * 
   * @param filters Filtros de busca
   * @returns Lista de logs e metadados de paginação
   */
  async list(filters: ListAuditLogsFilters) {
    const prismaWithTenant = this.prismaTenant.forTenant(filters.empresaId);

    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 50, 100); // Máximo 100 por página
    const skip = (page - 1) * limit;

    // Construir filtros do Prisma
    const where: any = {
      empresaId: filters.empresaId,
    };

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.resourceType) {
      where.resourceType = filters.resourceType;
    }

    if (filters.resourceId) {
      where.resourceId = filters.resourceId;
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    // Buscar logs e total
    const [logs, total] = await Promise.all([
      prismaWithTenant.auditLog.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      prismaWithTenant.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Busca um log específico por ID (com validação de tenant)
   * 
   * @param id ID do log
   * @param empresaId ID da empresa (para validação de tenant)
   * @returns Log encontrado ou null
   */
  async findOne(id: string, empresaId: string) {
    const prismaWithTenant = this.prismaTenant.forTenant(empresaId);
    return prismaWithTenant.auditLog.findUnique({
      where: { id },
    });
  }
}
