import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaTenantService } from "../prisma/prisma-tenant.service";
import { PrismaService } from "../prisma/prisma.service";
import { AlertsGateway } from "./alerts.gateway";
import type { CreateAlertInput, Alert } from "@licitafacil/shared";

export interface ListAlertsFilters {
  empresaId: string;
  status?: string;
  severity?: string;
  type?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class AlertService {
  constructor(
    private readonly prismaTenant: PrismaTenantService,
    private readonly prisma: PrismaService,
    private readonly alertsGateway: AlertsGateway,
  ) {}

  async create(data: CreateAlertInput, empresaId: string, createdBy?: string | null): Promise<Alert> {
    const prismaWithTenant = this.prismaTenant.forTenant(empresaId);

    const alert = await prismaWithTenant.alert.create({
      data: {
        empresaId,
        title: data.title,
        message: data.message,
        type: data.type ?? null,
        severity: data.severity ?? "INFO",
        resourceType: data.resourceType ?? null,
        resourceId: data.resourceId ?? null,
        metadata: data.metadata ?? null,
        status: "UNSEEN",
        createdBy: createdBy ?? null,
      },
    });

    const mapped = this.mapToAlert(alert);
    this.alertsGateway.emitNewAlert(empresaId, mapped);
    return mapped;
  }

  async findAll(filters: ListAlertsFilters) {
    const prismaWithTenant = this.prismaTenant.forTenant(filters.empresaId);

    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {
      empresaId: filters.empresaId,
    };
    if (filters.status) where.status = filters.status;
    if (filters.severity) where.severity = filters.severity;
    if (filters.type) where.type = filters.type;

    const [items, total] = await Promise.all([
      prismaWithTenant.alert.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prismaWithTenant.alert.count({ where }),
    ]);

    return {
      data: items.map((a) => this.mapToAlert(a)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, empresaId: string): Promise<Alert> {
    const prismaWithTenant = this.prismaTenant.forTenant(empresaId);
    const alert = await prismaWithTenant.alert.findUnique({ where: { id } });
    if (!alert) throw new NotFoundException(`Alerta ${id} não encontrado`);
    return this.mapToAlert(alert);
  }

  async markSeen(id: string, empresaId: string, _userId?: string | null) {
    const prismaWithTenant = this.prismaTenant.forTenant(empresaId);
    const alert = await prismaWithTenant.alert.update({
      where: { id },
      data: { status: "SEEN", seenAt: new Date() },
    });
    return this.mapToAlert(alert);
  }

  async markResolved(id: string, empresaId: string, _userId?: string | null) {
    const prismaWithTenant = this.prismaTenant.forTenant(empresaId);
    const alert = await prismaWithTenant.alert.update({
      where: { id },
      data: { status: "RESOLVED", resolvedAt: new Date() },
    });
    return this.mapToAlert(alert);
  }

  // Used by generator: create alert across tenants using PrismaService directly
  async createRaw(data: {
    empresaId: string;
    title: string;
    message: string;
    type?: string | null;
    severity?: string;
    resourceType?: string | null;
    resourceId?: string | null;
    metadata?: any;
  }) {
    const alert = await this.prisma.alert.create({
      data: {
        empresaId: data.empresaId,
        title: data.title,
        message: data.message,
        type: data.type ?? null,
        severity: data.severity ?? "INFO",
        resourceType: data.resourceType ?? null,
        resourceId: data.resourceId ?? null,
        metadata: data.metadata ?? null,
        status: "UNSEEN",
      },
    });
    const mapped = this.mapToAlert(alert);
    this.alertsGateway.emitNewAlert(data.empresaId, mapped);
    return mapped;
  }

  private mapToAlert(a: any): Alert {
    return {
      id: a.id,
      empresaId: a.empresaId,
      title: a.title,
      message: a.message,
      type: a.type,
      severity: a.severity,
      resourceType: a.resourceType,
      resourceId: a.resourceId,
      metadata: a.metadata,
      status: a.status,
      createdBy: a.createdBy ?? null,
      seenAt: a.seenAt?.toISOString() ?? null,
      resolvedAt: a.resolvedAt?.toISOString() ?? null,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    } as Alert;
  }
}

