import { Injectable } from "@nestjs/common";
import { PrismaTenantService } from "../prisma/prisma-tenant.service";

/**
 * Número de dias antes do vencimento para considerar prazo crítico (EXPIRING_SOON).
 * Configurável via env PRAZO_CRITICAL_DAYS_THRESHOLD. Default: 7.
 * @see .env.example
 */
function getCriticalDaysThreshold(): number {
  const raw = process.env.PRAZO_CRITICAL_DAYS_THRESHOLD ?? "7";
  const n = parseInt(raw, 10);
  return Number.isNaN(n) || n < 0 ? 7 : n;
}

/** Valor padrão exportado para testes (7). */
export const CRITICAL_DAYS_THRESHOLD_DEFAULT = 7;

/**
 * Retorna o threshold configurado (env ou default).
 * Usar este getter no serviço para respeitar config em runtime.
 */
export function getCriticalDaysThresholdConfig(): number {
  return getCriticalDaysThreshold();
}

/**
 * Verifica se a heurística de checklist está habilitada.
 * Default: false (desabilitado por segurança para evitar falsos positivos).
 */
function isChecklistHeuristicEnabled(): boolean {
  const raw = process.env.PRAZO_ENABLE_CHECKLIST_HEURISTIC ?? "false";
  return raw.toLowerCase() === "true";
}

/**
 * Verifica se um item de checklist está relacionado a um prazo (heurística restritiva).
 * Aplica apenas quando category === "PRAZO" (sem fallback de título para reduzir falsos positivos).
 * Retorna false se a heurística estiver desabilitada.
 */
function isChecklistItemRelatedToPrazo(item: {
  category: string | null;
  titulo: string;
}, prazoTitulo?: string): boolean {
  if (!isChecklistHeuristicEnabled()) {
    return false;
  }
  if (item.category !== "PRAZO") {
    return false;
  }

  // Reduz falso positivo: quando disponível, exige relação textual com o título do prazo.
  if (prazoTitulo) {
    const normalize = (value: string) =>
      value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
    const prazo = normalize(prazoTitulo);
    const tituloItem = normalize(item.titulo || "");
    if (!prazo || !tituloItem) return true;
    return tituloItem.includes(prazo) || prazo.includes(tituloItem);
  }

  return true;
}

/**
 * Enum com os motivos de criticidade de um prazo
 */
export enum CriticalReason {
  EXPIRED = "EXPIRED", // Prazo já vencido
  EXPIRING_SOON = "EXPIRING_SOON", // Prazo próximo do vencimento (dentro do threshold)
  /** Item de checklist marcado como crítico (isCritical) ainda não concluído. Não confundir com "etapa eliminatória" do edital. */
  CRITICAL_CHECKLIST_PENDING = "CRITICAL_CHECKLIST_PENDING",
  /** Proxy: item exige evidência (exigeEvidencia=true) sem documento vinculado (evidenciaId). Indica "documento obrigatório não entregue". */
  MISSING_REQUIRED_DOCUMENT = "MISSING_REQUIRED_DOCUMENT",
}

/**
 * Interface para o resultado da análise de criticidade
 */
export interface CriticalityAnalysis {
  isCritical: boolean;
  criticalReason: CriticalReason | null;
}

/**
 * Interface para dados necessários para análise de criticidade
 */
export interface PrazoCriticalityData {
  prazoId: string;
  dataPrazo: Date;
  bidId: string;
  empresaId: string;
}

/**
 * Início do dia em UTC para uma data (00:00:00.000 UTC).
 * Usado para comparar prazos por "data civil" em UTC e evitar diferenças de timezone do servidor.
 *
 * IMPORTANTE: Embora Prazo.dataPrazo seja DateTime (tem hora), a lógica de criticidade
 * compara apenas a DATA CIVIL (ignora hora). Um prazo "2025-01-28 23:59:59" é tratado
 * como "2025-01-28 00:00:00" para fins de cálculo de dias restantes.
 * Isso é intencional: prazos são considerados por dia, não por hora exata.
 */
function startOfDayUTC(d: Date): Date {
  const x = new Date(d);
  return new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate(), 0, 0, 0, 0));
}

/**
 * Dias restantes até a data do prazo, considerando apenas a data civil em UTC (não a hora).
 * Positivo = futuro, zero = hoje, negativo = passado.
 *
 * NOTA: Ignora a hora do prazo. Um prazo às 23:59:59 do dia 28 é tratado como "dia 28"
 * para comparação. Se precisar considerar hora exata no futuro, ajustar esta função.
 */
function daysRemainingUTC(deadline: Date): number {
  const now = new Date();
  const todayStart = startOfDayUTC(now);
  const deadlineStart = startOfDayUTC(deadline);
  const diffMs = deadlineStart.getTime() - todayStart.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Serviço centralizado para análise de criticidade de prazos.
 * Centraliza todas as regras de negócio relacionadas à identificação de prazos críticos.
 *
 * Regras de criticidade:
 * 1. Prazo vencido (data civil UTC do prazo < hoje UTC)
 * 2. Prazo próximo do vencimento (dias restantes <= PRAZO_CRITICAL_DAYS_THRESHOLD)
 * 3. Item de checklist crítico pendente (isCritical=true, não concluído, categoria/título relacionado a prazo)
 * 4. Documento obrigatório não entregue: proxy exigeEvidencia=true sem evidenciaId (item não concluído)
 */
@Injectable()
export class PrazoCriticalityService {
  constructor(private readonly prismaTenant: PrismaTenantService) {}

  /**
   * Analisa a criticidade de um prazo baseado em todas as regras de negócio.
   * Retorna o resultado com isCritical e motivo principal por prioridade.
   * Comparação de datas em UTC para consistência independente do timezone do servidor.
   */
  async analyzeCriticality(data: PrazoCriticalityData): Promise<CriticalityAnalysis> {
    const diasRestantes = daysRemainingUTC(data.dataPrazo);
    const reasons: CriticalReason[] = [];

    // Regra 1: Prazo vencido (mais crítico)
    if (diasRestantes < 0) {
      reasons.push(CriticalReason.EXPIRED);
    }

    // A relação Prazo <-> ChecklistItem usa filtro restritivo com category=PRAZO
    // e correspondência textual com o título do prazo para reduzir falso positivo.
    const prismaWithTenant = this.prismaTenant.forTenant(data.empresaId);
    const prazo = await prismaWithTenant.prazo.findUnique({ where: { id: data.prazoId } });
    const prazoTitulo = prazo?.titulo;

    let checklistItems: Array<{
      isCritical: boolean;
      concluido: boolean;
      category: string | null;
      titulo: string;
      exigeEvidencia: boolean;
      evidenciaId: string | null;
    }> = [];

    if (isChecklistHeuristicEnabled()) {
      checklistItems = await prismaWithTenant.checklistItem.findMany({
        where: {
          empresaId: data.empresaId,
          licitacaoId: data.bidId,
          deletedAt: null,
        },
      });
    }

    // Regra 2: Item de checklist marcado como crítico (isCritical) ainda não concluído
    // ⚠️ Heurística restritiva: apenas category === "PRAZO" (sem fallback de título)
    // ⚠️ Aplicada apenas se PRAZO_ENABLE_CHECKLIST_HEURISTIC=true
    const hasCriticalChecklistPending = checklistItems.some(
      (item) =>
        item.isCritical &&
        !item.concluido &&
        isChecklistItemRelatedToPrazo(item, prazoTitulo),
    );

    if (hasCriticalChecklistPending) {
      reasons.push(CriticalReason.CRITICAL_CHECKLIST_PENDING);
    }

    // Regra 3: Proxy "documento obrigatório não entregue" = exigeEvidencia sem evidenciaId, não concluído
    const hasMissingRequiredDocument = checklistItems.some(
      (item) =>
        item.exigeEvidencia &&
        !item.evidenciaId &&
        !item.concluido &&
        isChecklistItemRelatedToPrazo(item, prazoTitulo),
    );

    if (hasMissingRequiredDocument) {
      reasons.push(CriticalReason.MISSING_REQUIRED_DOCUMENT);
    }

    // Regra 4: Prazo próximo do vencimento (threshold configurável)
    const threshold = getCriticalDaysThreshold();
    if (diasRestantes <= threshold) {
      reasons.push(CriticalReason.EXPIRING_SOON);
    }

    if (reasons.length === 0) {
      return {
        isCritical: false,
        criticalReason: null,
      };
    }

    const orderedPriority: CriticalReason[] = [
      CriticalReason.EXPIRED,
      CriticalReason.CRITICAL_CHECKLIST_PENDING,
      CriticalReason.MISSING_REQUIRED_DOCUMENT,
      CriticalReason.EXPIRING_SOON,
    ];
    const primaryReason = orderedPriority.find((reason) => reasons.includes(reason)) ?? null;
    return {
      isCritical: true,
      criticalReason: primaryReason,
    };
  }

  /**
   * Analisa criticidade de múltiplos prazos em batch (sem N+1).
   * Uma única query busca todos os checklist items das licitações envolvidas.
   */
  async analyzeMultipleCriticality(
    prazos: Array<{ id: string; dataPrazo: Date; bidId: string }>,
    empresaId: string,
  ): Promise<Map<string, CriticalityAnalysis>> {
    const bidIds = [...new Set(prazos.map((p) => p.bidId))];
    const prismaWithTenant = this.prismaTenant.forTenant(empresaId);

    // Uma única query: todos os itens de checklist das licitações dos prazos (evita N+1)
    // ⚠️ Busca apenas se heurística habilitada (PRAZO_ENABLE_CHECKLIST_HEURISTIC=true)
    type ChecklistRow = Awaited<
      ReturnType<typeof prismaWithTenant.checklistItem.findMany>
    >[number];
    const allItems: ChecklistRow[] =
      isChecklistHeuristicEnabled() && bidIds.length > 0
        ? await prismaWithTenant.checklistItem.findMany({
            where: {
              empresaId,
              licitacaoId: { in: bidIds },
              deletedAt: null,
            },
          })
        : [];

    const checklistItemsByBid = new Map<string, ChecklistRow[]>();
    const prazoTitlesById = new Map<string, string>();
    if (prazos.length > 0) {
      const prazoRows = await prismaWithTenant.prazo.findMany({
        where: { id: { in: prazos.map((p) => p.id) } },
        select: { id: true, titulo: true },
      });
      for (const row of prazoRows) {
        prazoTitlesById.set(row.id, row.titulo);
      }
    }
    for (const item of allItems) {
      const list = checklistItemsByBid.get(item.licitacaoId) ?? [];
      list.push(item);
      checklistItemsByBid.set(item.licitacaoId, list);
    }

    const threshold = getCriticalDaysThreshold();
    const results = new Map<string, CriticalityAnalysis>();

    for (const prazo of prazos) {
      const diasRestantes = daysRemainingUTC(prazo.dataPrazo);
      const prazoTitulo = prazoTitlesById.get(prazo.id);
      const reasons: CriticalReason[] = [];

      if (diasRestantes < 0) {
        reasons.push(CriticalReason.EXPIRED);
      }

      const checklistItems = checklistItemsByBid.get(prazo.bidId) ?? [];

      // Regra 2: Item de checklist crítico pendente
      // ⚠️ Heurística restritiva: apenas category === "PRAZO" (sem fallback de título)
      // ⚠️ Aplicada apenas se PRAZO_ENABLE_CHECKLIST_HEURISTIC=true
      const hasCriticalChecklistPending = checklistItems.some(
        (item) =>
          item.isCritical &&
          !item.concluido &&
          isChecklistItemRelatedToPrazo(item, prazoTitulo),
      );
      if (hasCriticalChecklistPending) {
        reasons.push(CriticalReason.CRITICAL_CHECKLIST_PENDING);
      }

      // Regra 3: Documento obrigatório não entregue
      // ⚠️ Heurística restritiva: apenas category === "PRAZO" (sem fallback de título)
      // ⚠️ Aplicada apenas se PRAZO_ENABLE_CHECKLIST_HEURISTIC=true
      // ⚠️ Proxy: exigeEvidencia/evidenciaId
      const hasMissingRequiredDocument = checklistItems.some(
        (item) =>
          item.exigeEvidencia &&
          !item.evidenciaId &&
          !item.concluido &&
          isChecklistItemRelatedToPrazo(item, prazoTitulo),
      );
      if (hasMissingRequiredDocument) {
        reasons.push(CriticalReason.MISSING_REQUIRED_DOCUMENT);
      }

      if (diasRestantes <= threshold) {
        reasons.push(CriticalReason.EXPIRING_SOON);
      }

      if (reasons.length === 0) {
        results.set(prazo.id, { isCritical: false, criticalReason: null });
        continue;
      }

      const orderedPriority: CriticalReason[] = [
        CriticalReason.EXPIRED,
        CriticalReason.CRITICAL_CHECKLIST_PENDING,
        CriticalReason.MISSING_REQUIRED_DOCUMENT,
        CriticalReason.EXPIRING_SOON,
      ];
      const primaryReason = orderedPriority.find((reason) => reasons.includes(reason)) ?? null;
      results.set(prazo.id, { isCritical: true, criticalReason: primaryReason });
    }

    return results;
  }
}
