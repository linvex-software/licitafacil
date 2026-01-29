import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AlertService } from "./alert.service";

@Injectable()
export class AlertGeneratorService implements OnModuleInit, OnModuleDestroy {
  private intervalRef: NodeJS.Timeout | null = null;
  private readonly logger = new Logger(AlertGeneratorService.name);

  // Thresholds (days) - configurable via env in future
  private prazoThresholdDays = 7;
  private documentThresholdDays = 7;

  constructor(private readonly prisma: PrismaService, private readonly alertService: AlertService) {}

  onModuleInit() {
    // Run every 5 minutes
    const intervalMs = 5 * 60 * 1000;
    this.intervalRef = setInterval(() => {
      this.runChecks().catch((err) => {
        this.logger.error("Erro ao executar checks de alertas automáticos", err as any);
      });
    }, intervalMs);
    // Run immediately at startup
    this.runChecks().catch((err) => {
      this.logger.error("Erro ao executar checks de alertas automáticos", err as any);
    });
  }

  onModuleDestroy() {
    if (this.intervalRef) clearInterval(this.intervalRef);
  }

  private async runChecks() {
    await this.checkPrazos();
    await this.checkDocuments();
    await this.checkChecklistItems();
  }

  private async checkPrazos() {
    const now = new Date();
    const threshold = new Date(now);
    threshold.setDate(threshold.getDate() + this.prazoThresholdDays);

    const prazos = await this.prisma.prazo.findMany({
      where: {
        deletedAt: null,
        dataPrazo: { lte: threshold },
      },
      include: { bid: { select: { id: true, title: true } } },
    });

    for (const p of prazos) {
      const exists = await this.prisma.alert.findFirst({
        where: {
          empresaId: p.empresaId,
          resourceType: "Prazo",
          resourceId: p.id,
          status: { not: "RESOLVED" },
        },
      });
      if (!exists) {
        const licitacaoNome = p.bid?.title ?? p.bidId;
        const title = `Prazo: ${p.titulo}`;
        const message = `Prazo "${p.titulo}" da licitação "${licitacaoNome}" vence em ${p.dataPrazo.toISOString().slice(0, 10)}`;
        await this.alertService.createRaw({
          empresaId: p.empresaId,
          title,
          message,
          type: "PRAZO",
          severity: "WARNING",
          resourceType: "Prazo",
          resourceId: p.id,
          metadata: { bidId: p.bidId, bidTitle: p.bid?.title ?? null },
        });
      }
    }
  }

  private async checkDocuments() {
    const now = new Date();
    const threshold = new Date(now);
    threshold.setDate(threshold.getDate() + this.documentThresholdDays);

    const docs = await this.prisma.document.findMany({
      where: {
        deletedAt: null,
        doesExpire: true,
        expiresAt: { lte: threshold },
      },
      include: { bid: { select: { id: true, title: true } } },
    });

    for (const d of docs) {
      const exists = await this.prisma.alert.findFirst({
        where: {
          empresaId: d.empresaId,
          resourceType: "Document",
          resourceId: d.id,
          status: { not: "RESOLVED" },
        },
      });
      if (!exists) {
        const licitacaoNome = d.bid?.title ?? d.bidId ?? "N/A";
        const title = `Documento vencendo: ${d.name}`;
        const message = d.bidId
          ? `Documento "${d.name}" da licitação "${licitacaoNome}" vence em ${d.expiresAt?.toISOString().slice(0, 10)}`
          : `Documento "${d.name}" vence em ${d.expiresAt?.toISOString().slice(0, 10)}`;
        await this.alertService.createRaw({
          empresaId: d.empresaId,
          title,
          message,
          type: "DOCUMENT",
          severity: "WARNING",
          resourceType: "Document",
          resourceId: d.id,
          metadata: d.bidId ? { bidId: d.bidId, bidTitle: d.bid?.title ?? null } : undefined,
        });
      }
    }
  }

  private async checkChecklistItems() {
    const items = await this.prisma.checklistItem.findMany({
      where: {
        deletedAt: null,
        isCritical: true,
        concluido: false,
      },
      include: { licitacao: { select: { id: true, title: true } } },
    });

    for (const item of items) {
      const exists = await this.prisma.alert.findFirst({
        where: {
          empresaId: item.empresaId,
          resourceType: "ChecklistItem",
          resourceId: item.id,
          status: { not: "RESOLVED" },
        },
      });
      if (!exists) {
        const licitacaoNome = item.licitacao?.title ?? item.licitacaoId;
        const title = `Checklist pendente: ${item.titulo}`;
        const message = `Item crítico "${item.titulo}" da licitação "${licitacaoNome}" não está concluído.`;
        await this.alertService.createRaw({
          empresaId: item.empresaId,
          title,
          message,
          type: "CHECKLIST",
          severity: "CRITICAL",
          resourceType: "ChecklistItem",
          resourceId: item.id,
          metadata: {
            licitacaoId: item.licitacaoId,
            bidTitle: item.licitacao?.title ?? null,
          },
        });
      }
    }
  }
}

