import { Injectable } from "@nestjs/common";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
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
    // Flag opcional para testes: simular falha de auditoria (apenas em desenvolvimento)
    // Não afeta produção, apenas útil para validar que falhas não quebram requests
    if (process.env.AUDIT_FORCE_FAIL === "1" && process.env.NODE_ENV === "development") {
      throw new Error("Simulated audit failure for testing");
    }

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

  /**
   * Busca histórico de alterações de um recurso específico
   * 
   * Inclui informações do usuário que realizou cada alteração
   * 
   * @param resourceId ID do recurso (ex: ID da licitação)
   * @param resourceType Tipo do recurso (ex: "Bid")
   * @param empresaId ID da empresa (para validação de tenant)
   * @param page Página (default: 1)
   * @param limit Limite por página (default: 20, max: 100)
   * @returns Histórico de alterações com informações do usuário
   */
  async getResourceHistory(
    resourceId: string,
    resourceType: string,
    empresaId: string,
    page = 1,
    limit = 20,
  ) {
    const prismaWithTenant = this.prismaTenant.forTenant(empresaId);
    const safeLimit = Math.min(limit, 100);
    const skip = (page - 1) * safeLimit;

    const where = {
      empresaId,
      resourceId,
      resourceType,
    };

    // Buscar logs e total em paralelo
    const [logs, total] = await Promise.all([
      prismaWithTenant.auditLog.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: safeLimit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prismaWithTenant.auditLog.count({ where }),
    ]);

    // Mapear para formato de resposta mais amigável
    const data = logs.map((log) => ({
      id: log.id,
      action: log.action,
      userId: log.userId,
      userName: log.user?.name || "Sistema",
      userEmail: log.user?.email || null,
      changes: log.metadata,
      createdAt: log.createdAt.toISOString(),
      ipAddress: log.ip,
      userAgent: log.userAgent,
    }));

    return {
      data,
      pagination: {
        page,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }
}
