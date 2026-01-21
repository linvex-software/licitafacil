import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaTenantService } from "../prisma/prisma-tenant.service";
import { AuditLogService } from "../audit-log/audit-log.service";
import { OperationalState } from "@licitafacil/shared";
import type { Request } from "express";

/**
 * Interface para resultado da análise de risco
 */
export interface RiskAnalysisResult {
  bidId: string;
  currentState: string;
  suggestedState: string;
  shouldBeAtRisk: boolean;
  riskLevel: "NONE" | "LOW" | "MEDIUM" | "HIGH";
  criticalIssues: CriticalIssue[];
  summary: {
    totalItems: number;
    completedItems: number;
    pendingItems: number;
    criticalPendingItems: number;
    itemsRequiringEvidence: number;
    itemsWithoutEvidence: number;
  };
  lastAnalysisAt: string;
  isManualOverride: boolean;
}

/**
 * Interface para pendência crítica
 */
export interface CriticalIssue {
  itemId: string;
  titulo: string;
  category: string | null;
  reason: "CRITICAL_FLAG" | "REQUIRES_EVIDENCE" | "BOTH";
  isCritical: boolean;
  exigeEvidencia: boolean;
  hasEvidencia: boolean;
  concluido: boolean;
}

@Injectable()
export class BidRiskService {
  constructor(
    private readonly prismaTenant: PrismaTenantService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Analisa o risco de uma licitação com base nos itens do checklist
   * 
   * Critérios para pendência crítica:
   * 1. Item marcado como isCritical=true E não concluído
   * 2. Item com exigeEvidencia=true E (não concluído OU sem evidência vinculada)
   * 3. Ambos os critérios acima
   */
  async analyzeRisk(bidId: string, empresaId: string): Promise<RiskAnalysisResult> {
    const prismaWithTenant = this.prismaTenant.forTenant(empresaId);

    // Buscar licitação
    const bid = await prismaWithTenant.bid.findUnique({
      where: { id: bidId },
    });

    if (!bid) {
      throw new NotFoundException(`Licitação com ID ${bidId} não encontrada`);
    }

    // Buscar todos os itens do checklist (não deletados)
    const items = await prismaWithTenant.checklistItem.findMany({
      where: {
        empresaId,
        licitacaoId: bidId,
        deletedAt: null,
      },
    });

    // Análise dos itens
    const totalItems = items.length;
    const completedItems = items.filter((item) => item.concluido).length;
    const pendingItems = totalItems - completedItems;

    // Identificar pendências críticas
    const criticalIssues: CriticalIssue[] = [];

    for (const item of items) {
      // Pular itens já concluídos
      if (item.concluido) continue;

      const isCriticalFlag = item.isCritical;
      const requiresEvidence = item.exigeEvidencia && !item.evidenciaId;

      // Verificar se é uma pendência crítica
      if (isCriticalFlag || requiresEvidence) {
        const reason = isCriticalFlag && requiresEvidence
          ? "BOTH"
          : isCriticalFlag
            ? "CRITICAL_FLAG"
            : "REQUIRES_EVIDENCE";

        criticalIssues.push({
          itemId: item.id,
          titulo: item.titulo,
          category: item.category,
          reason,
          isCritical: item.isCritical,
          exigeEvidencia: item.exigeEvidencia,
          hasEvidencia: !!item.evidenciaId,
          concluido: item.concluido,
        });
      }
    }

    // Calcular estatísticas adicionais
    const itemsRequiringEvidence = items.filter((item) => item.exigeEvidencia).length;
    const itemsWithoutEvidence = items.filter(
      (item) => item.exigeEvidencia && !item.evidenciaId && !item.concluido,
    ).length;

    const criticalPendingItems = criticalIssues.length;

    // Determinar nível de risco
    let riskLevel: "NONE" | "LOW" | "MEDIUM" | "HIGH";
    let shouldBeAtRisk: boolean;

    if (criticalPendingItems === 0) {
      riskLevel = "NONE";
      shouldBeAtRisk = false;
    } else if (criticalPendingItems <= 2) {
      riskLevel = "LOW";
      shouldBeAtRisk = false; // Baixo risco não muda para EM_RISCO automaticamente
    } else if (criticalPendingItems <= 5) {
      riskLevel = "MEDIUM";
      shouldBeAtRisk = true;
    } else {
      riskLevel = "HIGH";
      shouldBeAtRisk = true;
    }

    // Estado sugerido
    const suggestedState = shouldBeAtRisk ? OperationalState.EM_RISCO : OperationalState.OK;

    return {
      bidId,
      currentState: bid.operationalState,
      suggestedState,
      shouldBeAtRisk,
      riskLevel,
      criticalIssues,
      summary: {
        totalItems,
        completedItems,
        pendingItems,
        criticalPendingItems,
        itemsRequiringEvidence,
        itemsWithoutEvidence,
      },
      lastAnalysisAt: new Date().toISOString(),
      isManualOverride: bid.manualRiskOverride,
    };
  }

  /**
   * Executa análise de risco e atualiza o estado operacional automaticamente
   * (exceto se houver override manual)
   * 
   * Retorna true se o estado foi atualizado, false caso contrário
   */
  async autoUpdateRiskState(
    bidId: string,
    empresaId: string,
    userId: string,
    request: Request,
  ): Promise<{ updated: boolean; analysis: RiskAnalysisResult }> {
    const prismaWithTenant = this.prismaTenant.forTenant(empresaId);

    // Buscar licitação
    const bid = await prismaWithTenant.bid.findUnique({
      where: { id: bidId },
    });

    if (!bid) {
      throw new NotFoundException(`Licitação com ID ${bidId} não encontrada`);
    }

    // Se há override manual, não atualizar automaticamente
    if (bid.manualRiskOverride) {
      const analysis = await this.analyzeRisk(bidId, empresaId);
      return { updated: false, analysis };
    }

    // Executar análise
    const analysis = await this.analyzeRisk(bidId, empresaId);

    // Se o estado sugerido é diferente do atual, atualizar
    if (analysis.suggestedState !== bid.operationalState) {
      const oldState = bid.operationalState;
      const newState = analysis.suggestedState;

      // Gerar motivo para log
      const riskReason =
        newState === OperationalState.EM_RISCO
          ? this.generateRiskReason(analysis)
          : null;

      // Atualizar estado
      await prismaWithTenant.bid.update({
        where: { id: bidId },
        data: {
          operationalState: newState,
          riskReason,
          lastRiskAnalysisAt: new Date(),
          manualRiskOverride: false,
        },
      });

      // Registrar no audit log
      await this.auditLogService.record({
        empresaId,
        userId,
        action: "bid.auto_risk_update",
        resourceType: "Bid",
        resourceId: bidId,
        metadata: {
          oldState,
          newState,
          riskLevel: analysis.riskLevel,
          criticalPendingItems: analysis.summary.criticalPendingItems,
          riskReason,
          isAutomatic: true,
        },
        ip: request.ip,
        userAgent: request.headers["user-agent"],
      });

      return { updated: true, analysis };
    }

    // Estado não mudou, apenas atualizar timestamp de análise
    await prismaWithTenant.bid.update({
      where: { id: bidId },
      data: {
        lastRiskAnalysisAt: new Date(),
      },
    });

    return { updated: false, analysis };
  }

  /**
   * Marca licitação como EM_RISCO manualmente (com override)
   */
  async markAtRisk(
    bidId: string,
    empresaId: string,
    userId: string,
    motivo: string,
    request: Request,
  ): Promise<RiskAnalysisResult> {
    const prismaWithTenant = this.prismaTenant.forTenant(empresaId);

    // Buscar licitação
    const bid = await prismaWithTenant.bid.findUnique({
      where: { id: bidId },
    });

    if (!bid) {
      throw new NotFoundException(`Licitação com ID ${bidId} não encontrada`);
    }

    // Verificar se já está em risco
    if (bid.operationalState === OperationalState.EM_RISCO && bid.manualRiskOverride) {
      throw new BadRequestException("Licitação já está marcada como EM_RISCO manualmente");
    }

    const oldState = bid.operationalState;

    // Atualizar para EM_RISCO com override manual
    await prismaWithTenant.bid.update({
      where: { id: bidId },
      data: {
        operationalState: OperationalState.EM_RISCO,
        riskReason: motivo,
        manualRiskOverride: true,
        manualRiskOverrideBy: userId,
        manualRiskOverrideAt: new Date(),
        lastRiskAnalysisAt: new Date(),
      },
    });

    // Registrar no audit log
    await this.auditLogService.record({
      empresaId,
      userId,
      action: "bid.manual_mark_at_risk",
      resourceType: "Bid",
      resourceId: bidId,
      metadata: {
        oldState,
        newState: OperationalState.EM_RISCO,
        motivo,
        isManual: true,
      },
      ip: request.ip,
      userAgent: request.headers["user-agent"],
    });

    // Retornar análise atualizada
    return this.analyzeRisk(bidId, empresaId);
  }

  /**
   * Remove estado EM_RISCO manualmente (com override)
   */
  async clearRisk(
    bidId: string,
    empresaId: string,
    userId: string,
    request: Request,
  ): Promise<RiskAnalysisResult> {
    const prismaWithTenant = this.prismaTenant.forTenant(empresaId);

    // Buscar licitação
    const bid = await prismaWithTenant.bid.findUnique({
      where: { id: bidId },
    });

    if (!bid) {
      throw new NotFoundException(`Licitação com ID ${bidId} não encontrada`);
    }

    // Verificar se está em risco
    if (bid.operationalState !== OperationalState.EM_RISCO) {
      throw new BadRequestException("Licitação não está em estado EM_RISCO");
    }

    const oldState = bid.operationalState;

    // Atualizar para OK com override manual
    await prismaWithTenant.bid.update({
      where: { id: bidId },
      data: {
        operationalState: OperationalState.OK,
        riskReason: null,
        manualRiskOverride: true,
        manualRiskOverrideBy: userId,
        manualRiskOverrideAt: new Date(),
        lastRiskAnalysisAt: new Date(),
      },
    });

    // Registrar no audit log
    await this.auditLogService.record({
      empresaId,
      userId,
      action: "bid.manual_clear_risk",
      resourceType: "Bid",
      resourceId: bidId,
      metadata: {
        oldState,
        newState: OperationalState.OK,
        isManual: true,
      },
      ip: request.ip,
      userAgent: request.headers["user-agent"],
    });

    // Retornar análise atualizada
    return this.analyzeRisk(bidId, empresaId);
  }

  /**
   * Remove o override manual, permitindo que o sistema volte a atualizar automaticamente
   */
  async removeManualOverride(
    bidId: string,
    empresaId: string,
    userId: string,
    request: Request,
  ): Promise<{ analysis: RiskAnalysisResult; updated: boolean }> {
    const prismaWithTenant = this.prismaTenant.forTenant(empresaId);

    // Buscar licitação
    const bid = await prismaWithTenant.bid.findUnique({
      where: { id: bidId },
    });

    if (!bid) {
      throw new NotFoundException(`Licitação com ID ${bidId} não encontrada`);
    }

    // Verificar se há override manual
    if (!bid.manualRiskOverride) {
      throw new BadRequestException("Não há override manual ativo para esta licitação");
    }

    // Remover override manual
    await prismaWithTenant.bid.update({
      where: { id: bidId },
      data: {
        manualRiskOverride: false,
        manualRiskOverrideBy: null,
        manualRiskOverrideAt: null,
      },
    });

    // Registrar no audit log
    await this.auditLogService.record({
      empresaId,
      userId,
      action: "bid.remove_manual_override",
      resourceType: "Bid",
      resourceId: bidId,
      metadata: {
        previousOverride: true,
      },
      ip: request.ip,
      userAgent: request.headers["user-agent"],
    });

    // Executar análise automática após remover override
    return this.autoUpdateRiskState(bidId, empresaId, userId, request);
  }

  /**
   * Gera motivo textual para o estado EM_RISCO
   */
  private generateRiskReason(analysis: RiskAnalysisResult): string {
    const { criticalIssues, summary, riskLevel } = analysis;

    if (criticalIssues.length === 0) {
      return "Sem pendências críticas detectadas.";
    }

    const parts: string[] = [];

    parts.push(`Nível de risco: ${riskLevel}.`);
    parts.push(`${summary.criticalPendingItems} pendência(s) crítica(s) detectada(s).`);

    // Agrupar por motivo
    const byCriticalFlag = criticalIssues.filter((i) => i.reason === "CRITICAL_FLAG").length;
    const byEvidence = criticalIssues.filter((i) => i.reason === "REQUIRES_EVIDENCE").length;
    const byBoth = criticalIssues.filter((i) => i.reason === "BOTH").length;

    if (byBoth > 0) {
      parts.push(`${byBoth} item(ns) crítico(s) sem evidência.`);
    }
    if (byCriticalFlag > 0) {
      parts.push(`${byCriticalFlag} item(ns) crítico(s) não concluído(s).`);
    }
    if (byEvidence > 0) {
      parts.push(`${byEvidence} item(ns) requer evidência faltante.`);
    }

    return parts.join(" ");
  }
}
