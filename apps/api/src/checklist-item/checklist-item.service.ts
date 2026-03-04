import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaTenantService } from "../prisma/prisma-tenant.service";
import {
  type CreateLicitacaoChecklistItemInput,
  type UpdateLicitacaoChecklistItemInput,
  type LicitacaoChecklistItem,
} from "@licitafacil/shared";
import { BidService } from "../bid/bid.service";
import { BidRiskService } from "../bid/bid-risk.service";
import { DocumentService } from "../document/document.service";
import type { Request } from "express";

/**
 * Interface para filtros de listagem de itens de checklist
 */
export interface ListChecklistItemsFilters {
  empresaId: string;
  licitacaoId: string;
}

@Injectable()
export class ChecklistItemService {
  constructor(
    private readonly prismaTenant: PrismaTenantService,
    private readonly bidService: BidService,
    private readonly bidRiskService: BidRiskService,
    private readonly documentService: DocumentService,
  ) { }

  /**
   * Cria um novo item de checklist para uma licitação
   *
   * Regras de domínio:
   * - Item começa sempre como não concluído
   * - Se exigeEvidencia=true, evidenciaId pode ser fornecido opcionalmente
   * - Valida que a licitação existe e pertence ao tenant
   * - Executa análise automática de risco após criação (se item for crítico)
   */
  async create(
    data: CreateLicitacaoChecklistItemInput,
    empresaId: string,
    userId: string,
    request: Request,
  ): Promise<LicitacaoChecklistItem> {
    const prismaWithTenant = this.prismaTenant.forTenant(empresaId);

    // Validar que a licitação existe e pertence ao tenant
    await this.bidService.findOne(data.licitacaoId, empresaId);

    // Se exigeEvidencia=true e evidenciaId foi fornecido, validar que o documento existe
    if (data.exigeEvidencia && data.evidenciaId) {
      await this.documentService.findOne(data.evidenciaId, empresaId);
    }

    const item = await prismaWithTenant.checklistItem.create({
      data: {
        empresaId,
        licitacaoId: data.licitacaoId,
        titulo: data.titulo,
        descricao: data.descricao ?? null,
        category: data.category ?? null,
        exigeEvidencia: data.exigeEvidencia ?? false,
        isCritical: data.isCritical ?? false,
        concluido: false, // Sempre começa como não concluído
        evidenciaId: data.evidenciaId ?? null,
      },
    });

    // Executar análise automática de risco se o item for crítico ou exigir evidência
    if (item.isCritical || item.exigeEvidencia) {
      // Executar em background (não bloqueia resposta)
      this.bidRiskService
        .autoUpdateRiskState(data.licitacaoId, empresaId, userId, request)
        .catch((error) => {
          console.error("Erro ao atualizar análise de risco automaticamente:", error);
        });
    }

    return this.mapToChecklistItem(item);
  }

  /**
   * Lista todos os itens de checklist de uma licitação
   */
  async findAll(filters: ListChecklistItemsFilters): Promise<LicitacaoChecklistItem[]> {
    const prismaWithTenant = this.prismaTenant.forTenant(filters.empresaId);

    // Validar que a licitação existe e pertence ao tenant
    await this.bidService.findOne(filters.licitacaoId, filters.empresaId);

    const items = await prismaWithTenant.checklistItem.findMany({
      where: {
        empresaId: filters.empresaId,
        licitacaoId: filters.licitacaoId,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return items.map((item) => this.mapToChecklistItem(item));
  }

  /**
   * Busca um item de checklist por ID (com filtro de tenant)
   */
  async findOne(id: string, empresaId: string): Promise<LicitacaoChecklistItem> {
    const prismaWithTenant = this.prismaTenant.forTenant(empresaId);
    const item = await prismaWithTenant.checklistItem.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException(`Item de checklist com ID ${id} não encontrado`);
    }

    return this.mapToChecklistItem(item);
  }

  /**
   * Marca um item como concluído
   *
   * Regras de domínio:
   * - Item só pode ser marcado como concluído se:
   *   - exigeEvidencia = false
   *   OU
   *   - exigeEvidencia = true e existe evidência vinculada (evidenciaId)
   * - Ao marcar como concluído:
   *   - registrar usuário responsável
   *   - registrar data/hora em UTC
   * - Executa análise automática de risco após conclusão
   */
  async markAsCompleted(
    id: string,
    empresaId: string,
    userId: string,
    request: Request,
    evidenciaId?: string | null,
  ): Promise<LicitacaoChecklistItem> {
    const prismaWithTenant = this.prismaTenant.forTenant(empresaId);

    const item = await prismaWithTenant.checklistItem.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException(`Item de checklist com ID ${id} não encontrado`);
    }

    // Validação de domínio: não permitir concluir item já concluído
    if (item.concluido) {
      throw new BadRequestException("Este item já está concluído.");
    }

    // Validar regra de negócio: se exige evidência, deve ter evidência vinculada
    if (item.exigeEvidencia) {
      // Se já tem evidência vinculada, usar ela
      const finalEvidenciaId = item.evidenciaId || evidenciaId;

      if (!finalEvidenciaId) {
        throw new BadRequestException(
          "Este item exige evidência. É necessário vincular um documento antes de marcar como concluído.",
        );
      }

      // Validar que o documento existe e pertence ao tenant
      await this.documentService.findOne(finalEvidenciaId, empresaId);

      // Atualizar com evidência se foi fornecida
      if (evidenciaId && !item.evidenciaId) {
        await prismaWithTenant.checklistItem.update({
          where: { id },
          data: { evidenciaId },
        });
      }
    }

    // Marcar como concluído
    const now = new Date();
    const updatedItem = await prismaWithTenant.checklistItem.update({
      where: { id },
      data: {
        concluido: true,
        concluidoPor: userId,
        concluidoEm: now,
      },
    });

    // Executar análise automática de risco após conclusão
    this.bidRiskService
      .autoUpdateRiskState(item.licitacaoId, empresaId, userId, request)
      .catch((error) => {
        console.error("Erro ao atualizar análise de risco automaticamente:", error);
      });

    return this.mapToChecklistItem(updatedItem);
  }

  /**
   * Desmarca um item (marca como não concluído)
   *
   * Regras de domínio:
   * - Ao desmarcar:
   *   - limpar concluidoPor e concluidoEm
   *   - manter evidenciaId (não limpar)
   * - Executa análise automática de risco após mudança
   */
  async markAsIncomplete(
    id: string,
    empresaId: string,
    userId: string,
    request: Request,
  ): Promise<LicitacaoChecklistItem> {
    const prismaWithTenant = this.prismaTenant.forTenant(empresaId);

    const item = await prismaWithTenant.checklistItem.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException(`Item de checklist com ID ${id} não encontrado`);
    }

    // Validação de domínio: não permitir desmarcar item já não concluído
    if (!item.concluido) {
      throw new BadRequestException("Este item já está não concluído.");
    }

    const updatedItem = await prismaWithTenant.checklistItem.update({
      where: { id },
      data: {
        concluido: false,
        concluidoPor: null,
        concluidoEm: null,
      },
    });

    // Executar análise automática de risco após desmarcar
    this.bidRiskService
      .autoUpdateRiskState(item.licitacaoId, empresaId, userId, request)
      .catch((error) => {
        console.error("Erro ao atualizar análise de risco automaticamente:", error);
      });

    return this.mapToChecklistItem(updatedItem);
  }

  /**
   * Atualiza um item de checklist
   *
   * Regras de domínio:
   * - Se item está concluído e exigeEvidencia mudou para true sem evidência, não permitir
   * - Se item está concluído e exigeEvidencia=true, não permitir remover evidência
   * - Executa análise automática de risco se campos críticos foram alterados
   */
  async update(
    id: string,
    data: UpdateLicitacaoChecklistItemInput,
    empresaId: string,
    userId: string,
    request: Request,
  ): Promise<LicitacaoChecklistItem> {
    const prismaWithTenant = this.prismaTenant.forTenant(empresaId);

    const item = await prismaWithTenant.checklistItem.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException(`Item de checklist com ID ${id} não encontrado`);
    }

    // Validar regras de negócio
    if (item.concluido) {
      // Se está concluído e exigeEvidencia mudou para true sem evidência
      if (data.exigeEvidencia === true && !item.evidenciaId && !data.evidenciaId) {
        throw new BadRequestException(
          "Não é possível alterar para exigeEvidencia=true sem vincular uma evidência, pois o item já está concluído.",
        );
      }

      // Se está concluído e tentando remover evidência
      if (data.evidenciaId === null && item.evidenciaId) {
        throw new BadRequestException(
          "Não é possível remover a evidência de um item concluído.",
        );
      }
    }

    // Se evidenciaId foi fornecido, validar que o documento existe
    if (data.evidenciaId) {
      await this.documentService.findOne(data.evidenciaId, empresaId);
    }

    const updatedItem = await prismaWithTenant.checklistItem.update({
      where: { id },
      data: {
        ...(data.titulo && { titulo: data.titulo }),
        ...(data.descricao !== undefined && { descricao: data.descricao }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.exigeEvidencia !== undefined && { exigeEvidencia: data.exigeEvidencia }),
        ...(data.isCritical !== undefined && { isCritical: data.isCritical }),
        ...(data.evidenciaId !== undefined && { evidenciaId: data.evidenciaId }),
      },
    });

    // Se alterou campos que afetam risco (isCritical ou exigeEvidencia), executar análise
    if (
      data.isCritical !== undefined ||
      data.exigeEvidencia !== undefined ||
      data.evidenciaId !== undefined
    ) {
      this.bidRiskService
        .autoUpdateRiskState(item.licitacaoId, empresaId, userId, request)
        .catch((error) => {
          console.error("Erro ao atualizar análise de risco automaticamente:", error);
        });
    }

    return this.mapToChecklistItem(updatedItem);
  }

  /**
   * Remove um item de checklist
   *
   * Regras de domínio:
   * - Executa análise automática de risco após a exclusão do item se ele for crítico ou exigir evidência.
   */
  async delete(
    id: string,
    empresaId: string,
    userId: string,
    request: Request,
  ): Promise<void> {
    const prismaWithTenant = this.prismaTenant.forTenant(empresaId);

    const item = await prismaWithTenant.checklistItem.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException(`Item de checklist com ID ${id} não encontrado`);
    }

    await prismaWithTenant.checklistItem.delete({
      where: { id },
    });

    if (item.isCritical || item.exigeEvidencia) {
      this.bidRiskService
        .autoUpdateRiskState(item.licitacaoId, empresaId, userId, request)
        .catch((error) => {
          console.error("Erro ao atualizar análise de risco automaticamente:", error);
        });
    }
  }

  /**
   * Mapeia entidade Prisma para LicitacaoChecklistItem
   */
  private mapToChecklistItem(item: {
    id: string;
    empresaId: string;
    licitacaoId: string;
    titulo: string;
    descricao: string | null;
    category: string | null;
    exigeEvidencia: boolean;
    isCritical: boolean;
    concluido: boolean;
    concluidoPor: string | null;
    concluidoEm: Date | null;
    evidenciaId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): LicitacaoChecklistItem {
    return {
      id: item.id,
      empresaId: item.empresaId,
      licitacaoId: item.licitacaoId,
      titulo: item.titulo,
      descricao: item.descricao,
      category: item.category,
      exigeEvidencia: item.exigeEvidencia,
      isCritical: item.isCritical,
      concluido: item.concluido,
      concluidoPor: item.concluidoPor,
      concluidoEm: item.concluidoEm?.toISOString() ?? null,
      evidenciaId: item.evidenciaId,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}
