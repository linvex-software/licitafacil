import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaTenantService } from "../prisma/prisma-tenant.service";
import {
  type CreateChecklistTemplateInput,
  type UpdateChecklistTemplateInput,
  type ChecklistTemplate,
  type ChecklistItem,
} from "@licitafacil/shared";
import { v4 as uuidv4 } from "uuid";

/**
 * Interface para filtros de listagem de templates
 */
export interface ListChecklistTemplatesFilters {
  empresaId: string;
  modality?: string;
  isActive?: boolean;
  isDefault?: boolean;
  search?: string; // Busca por nome
  page?: number;
  limit?: number;
}

@Injectable()
export class ChecklistTemplateService {
  constructor(
    private readonly prismaTenant: PrismaTenantService,
  ) {}

  /**
   * Valida e garante que todos os itens tenham UUID
   */
  private ensureItemsHaveIds(items: Array<Partial<ChecklistItem> & { title: string; order: number }>): ChecklistItem[] {
    return items.map((item) => ({
      ...item,
      id: item.id || uuidv4(),
    })) as ChecklistItem[];
  }

  /**
   * Cria um novo template de checklist
   */
  async create(
    data: CreateChecklistTemplateInput,
    empresaId: string,
    userId: string,
  ): Promise<ChecklistTemplate> {
    const prismaWithTenant = this.prismaTenant.forTenant(empresaId);

    // Garantir que todos os itens tenham IDs
    const itemsWithIds = this.ensureItemsHaveIds(data.items);

    // Validar que não há IDs duplicados
    const itemIds = itemsWithIds.map((item) => item.id);
    const uniqueIds = new Set(itemIds);
    if (itemIds.length !== uniqueIds.size) {
      throw new BadRequestException("Itens do checklist não podem ter IDs duplicados");
    }

    // Validar que as ordens são únicas
    const orders = itemsWithIds.map((item) => item.order);
    const uniqueOrders = new Set(orders);
    if (orders.length !== uniqueOrders.size) {
      throw new BadRequestException("Ordens dos itens devem ser únicas");
    }

    const template = await prismaWithTenant.checklistTemplate.create({
      data: {
        modality: data.modality,
        name: data.name,
        description: data.description ?? null,
        items: itemsWithIds as any,
        isActive: data.isActive ?? true,
        isDefault: data.isDefault ?? false,
        createdBy: userId,
        empresaId,
      },
    });

    return this.mapToChecklistTemplate(template);
  }

  /**
   * Lista templates com filtros e paginação
   */
  async findAll(filters: ListChecklistTemplatesFilters) {
    const prismaWithTenant = this.prismaTenant.forTenant(filters.empresaId);

    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100); // Máximo 100 por página
    const skip = (page - 1) * limit;

    // Construir filtros do Prisma
    const where: any = {
      empresaId: filters.empresaId,
    };

    if (filters.modality) {
      where.modality = filters.modality;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.isDefault !== undefined) {
      where.isDefault = filters.isDefault;
    }

    // Busca por nome (case insensitive)
    if (filters.search) {
      where.name = { contains: filters.search, mode: "insensitive" };
    }

    // Buscar templates e total
    const [templates, total] = await Promise.all([
      prismaWithTenant.checklistTemplate.findMany({
        where,
        orderBy: [
          { modality: "asc" },
          { isDefault: "desc" },
          { name: "asc" },
        ],
        skip,
        take: limit,
      }),
      prismaWithTenant.checklistTemplate.count({ where }),
    ]);

    return {
      data: templates.map((template) => this.mapToChecklistTemplate(template)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Busca um template por ID (com filtro de tenant)
   */
  async findOne(id: string, empresaId: string): Promise<ChecklistTemplate> {
    const prismaWithTenant = this.prismaTenant.forTenant(empresaId);
    const template = await prismaWithTenant.checklistTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException(`Template de checklist com ID ${id} não encontrado`);
    }

    return this.mapToChecklistTemplate(template);
  }

  /**
   * Atualiza um template de checklist
   */
  async update(
    id: string,
    data: UpdateChecklistTemplateInput,
    empresaId: string,
  ): Promise<ChecklistTemplate> {
    const prismaWithTenant = this.prismaTenant.forTenant(empresaId);

    // Verificar se o template existe
    const existingTemplate = await prismaWithTenant.checklistTemplate.findUnique({
      where: { id },
    });

    if (!existingTemplate) {
      throw new NotFoundException(`Template de checklist com ID ${id} não encontrado`);
    }

    // Preparar dados de atualização
    const updateData: any = {};

    if (data.modality !== undefined) {
      updateData.modality = data.modality;
    }

    if (data.name !== undefined) {
      updateData.name = data.name;
    }

    if (data.description !== undefined) {
      updateData.description = data.description ?? null;
    }

    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }

    if (data.isDefault !== undefined) {
      updateData.isDefault = data.isDefault;
    }

    // Se items foram fornecidos, validar e processar
    if (data.items !== undefined) {
      // Garantir que todos os itens tenham IDs
      const itemsWithIds = this.ensureItemsHaveIds(data.items);

      // Validar que não há IDs duplicados
      const itemIds = itemsWithIds.map((item) => item.id);
      const uniqueIds = new Set(itemIds);
      if (itemIds.length !== uniqueIds.size) {
        throw new BadRequestException("Itens do checklist não podem ter IDs duplicados");
      }

      // Validar que as ordens são únicas
      const orders = itemsWithIds.map((item) => item.order);
      const uniqueOrders = new Set(orders);
      if (orders.length !== uniqueOrders.size) {
        throw new BadRequestException("Ordens dos itens devem ser únicas");
      }

      updateData.items = itemsWithIds as any;
    }

    // Atualizar template
    const updatedTemplate = await prismaWithTenant.checklistTemplate.update({
      where: { id },
      data: updateData,
    });

    return this.mapToChecklistTemplate(updatedTemplate);
  }

  /**
   * Remove um template (soft delete é feito via SoftDeleteService)
   * Este método não deve ser usado diretamente
   */
  async remove(id: string, empresaId: string): Promise<void> {
    const prismaWithTenant = this.prismaTenant.forTenant(empresaId);

    const template = await prismaWithTenant.checklistTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException(`Template de checklist com ID ${id} não encontrado`);
    }

    // Soft delete é feito via SoftDeleteService
    // Este método apenas valida que o template existe
  }

  /**
   * Mapeia entidade Prisma para ChecklistTemplate
   */
  private mapToChecklistTemplate(template: {
    id: string;
    empresaId: string;
    modality: string;
    name: string;
    description: string | null;
    items: any; // JSON
    isActive: boolean;
    isDefault: boolean;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }): ChecklistTemplate {
    return {
      id: template.id,
      empresaId: template.empresaId,
      modality: template.modality,
      name: template.name,
      description: template.description,
      items: Array.isArray(template.items) ? template.items : [],
      isActive: template.isActive,
      isDefault: template.isDefault,
      createdBy: template.createdBy,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
      deletedAt: template.deletedAt?.toISOString() ?? null,
    };
  }

  /**
   * Busca templates por modalidade
   */
  async findByModality(modality: string, empresaId: string) {
    return (await this.findAll({ empresaId, modality, page: 1, limit: 100 })).data;
  }

  /**
   * Busca templates padrão por modalidade
   */
  async findDefaultByModality(modality: string, empresaId: string) {
    return (
      await this.findAll({
        empresaId,
        modality,
        isDefault: true,
        isActive: true,
        page: 1,
        limit: 100,
      })
    ).data;
  }

  /**
   * Conta total de templates da empresa
   */
  async count(empresaId: string): Promise<number> {
    const prismaWithTenant = this.prismaTenant.forTenant(empresaId);
    return prismaWithTenant.checklistTemplate.count();
  }
}
