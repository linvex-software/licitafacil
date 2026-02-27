/**
 * Testes unitários para PrazoCriticalityService
 *
 * Cobre todas as regras de criticidade:
 * - Prazo vencido (EXPIRED)
 * - Prazo próximo do vencimento (EXPIRING_SOON)
 * - Item de checklist crítico pendente (CRITICAL_CHECKLIST_PENDING)
 * - Documento obrigatório não entregue (MISSING_REQUIRED_DOCUMENT)
 */

import { Test, type TestingModule } from "@nestjs/testing";
import {
  PrazoCriticalityService,
  CRITICAL_DAYS_THRESHOLD_DEFAULT,
  CriticalReason,
} from "../prazo-criticality.service";
import { PrismaTenantService } from "../../prisma/prisma-tenant.service";

describe("PrazoCriticalityService", () => {
  let service: PrazoCriticalityService;
  let prismaTenant: jest.Mocked<PrismaTenantService>;

  const empresaId = "empresa-123";
  const bidId = "bid-123";
  const prazoId = "prazo-123";

  beforeEach(async () => {
    const mockPrismaClient = {
      checklistItem: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrazoCriticalityService,
        {
          provide: PrismaTenantService,
          useValue: {
            forTenant: jest.fn().mockReturnValue(mockPrismaClient),
          },
        },
      ],
    }).compile();

    service = module.get<PrazoCriticalityService>(PrazoCriticalityService);
    prismaTenant = module.get(PrismaTenantService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Limpar variáveis de ambiente após cada teste
    delete process.env.PRAZO_ENABLE_CHECKLIST_HEURISTIC;
  });

  describe("analyzeCriticality - Prazo Vencido (EXPIRED)", () => {
    it("deve identificar prazo vencido como crítico", async () => {
      const hoje = new Date();
      const dataPrazoVencida = new Date(hoje);
      dataPrazoVencida.setDate(hoje.getDate() - 1); // Ontem

      const prismaClient = prismaTenant.forTenant(empresaId);
      (prismaClient.checklistItem.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.analyzeCriticality({
        prazoId,
        dataPrazo: dataPrazoVencida,
        bidId,
        empresaId,
      });

      expect(result.isCritical).toBe(true);
      expect(result.criticalReason).toBe(CriticalReason.EXPIRED);
    });

    it("deve identificar prazo vencido há vários dias como crítico", async () => {
      const hoje = new Date();
      const dataPrazoVencida = new Date(hoje);
      dataPrazoVencida.setDate(hoje.getDate() - 30); // 30 dias atrás

      const prismaClient = prismaTenant.forTenant(empresaId);
      (prismaClient.checklistItem.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.analyzeCriticality({
        prazoId,
        dataPrazo: dataPrazoVencida,
        bidId,
        empresaId,
      });

      expect(result.isCritical).toBe(true);
      expect(result.criticalReason).toBe(CriticalReason.EXPIRED);
    });
  });

  describe("analyzeCriticality - Prazo Próximo do Vencimento (EXPIRING_SOON)", () => {
    it("deve identificar prazo que vence hoje como crítico", async () => {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const prismaClient = prismaTenant.forTenant(empresaId);
      (prismaClient.checklistItem.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.analyzeCriticality({
        prazoId,
        dataPrazo: hoje,
        bidId,
        empresaId,
      });

      expect(result.isCritical).toBe(true);
      expect(result.criticalReason).toBe(CriticalReason.EXPIRING_SOON);
    });

    it(`deve identificar prazo que vence em ${CRITICAL_DAYS_THRESHOLD_DEFAULT} dias (threshold padrão) como crítico`, async () => {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const dataPrazo = new Date(hoje);
      dataPrazo.setDate(hoje.getDate() + CRITICAL_DAYS_THRESHOLD_DEFAULT);

      const prismaClient = prismaTenant.forTenant(empresaId);
      (prismaClient.checklistItem.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.analyzeCriticality({
        prazoId,
        dataPrazo,
        bidId,
        empresaId,
      });

      expect(result.isCritical).toBe(true);
      expect(result.criticalReason).toBe(CriticalReason.EXPIRING_SOON);
    });

    it("não deve identificar prazo que vence além do threshold como crítico", async () => {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const dataPrazo = new Date(hoje);
      dataPrazo.setDate(hoje.getDate() + CRITICAL_DAYS_THRESHOLD_DEFAULT + 1); // Um dia além do threshold

      const prismaClient = prismaTenant.forTenant(empresaId);
      (prismaClient.checklistItem.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.analyzeCriticality({
        prazoId,
        dataPrazo,
        bidId,
        empresaId,
      });

      expect(result.isCritical).toBe(false);
      expect(result.criticalReason).toBeNull();
    });
  });

  describe("analyzeCriticality - Item de Checklist Crítico Pendente (CRITICAL_CHECKLIST_PENDING)", () => {
    it("NÃO deve identificar quando feature flag está desabilitada (default)", async () => {
      // Garantir que flag está desabilitada (default)
      delete process.env.PRAZO_ENABLE_CHECKLIST_HEURISTIC;

      const hoje = new Date();
      const dataPrazo = new Date(hoje);
      dataPrazo.setDate(hoje.getDate() + 30); // 30 dias no futuro

      const prismaClient = prismaTenant.forTenant(empresaId);
      // Mesmo com item crítico, não deve buscar checklist items (heurística desabilitada)
      (prismaClient.checklistItem.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.analyzeCriticality({
        prazoId,
        dataPrazo,
        bidId,
        empresaId,
      });

      // Não deve ser crítico por checklist (heurística desabilitada)
      expect(result.isCritical).toBe(false);
      expect(result.criticalReason).toBeNull();
      // Verificar que findMany não foi chamado (heurística desabilitada)
      expect(prismaClient.checklistItem.findMany).not.toHaveBeenCalled();
    });

    it("deve identificar prazo associado a item crítico não concluído quando flag habilitada e category=PRAZO", async () => {
      process.env.PRAZO_ENABLE_CHECKLIST_HEURISTIC = "true";

      const hoje = new Date();
      const dataPrazo = new Date(hoje);
      dataPrazo.setDate(hoje.getDate() + 30); // 30 dias no futuro

      const prismaClient = prismaTenant.forTenant(empresaId);
      (prismaClient.checklistItem.findMany as jest.Mock).mockResolvedValue([
        {
          id: "item-1",
          isCritical: true,
          concluido: false,
          category: "PRAZO", // category === "PRAZO" (heurística restritiva)
          titulo: "Prazo de entrega de propostas",
          exigeEvidencia: false,
          evidenciaId: null,
        },
      ]);

      const result = await service.analyzeCriticality({
        prazoId,
        dataPrazo,
        bidId,
        empresaId,
      });

      expect(result.isCritical).toBe(true);
      expect(result.criticalReason).toBe(CriticalReason.CRITICAL_CHECKLIST_PENDING);
    });

    it("NÃO deve identificar quando item tem título com 'prazo' mas category não é PRAZO (heurística restritiva)", async () => {
      process.env.PRAZO_ENABLE_CHECKLIST_HEURISTIC = "true";

      const hoje = new Date();
      const dataPrazo = new Date(hoje);
      dataPrazo.setDate(hoje.getDate() + 30);

      const prismaClient = prismaTenant.forTenant(empresaId);
      (prismaClient.checklistItem.findMany as jest.Mock).mockResolvedValue([
        {
          id: "item-1",
          isCritical: true,
          concluido: false,
          category: "DOCUMENTACAO", // category !== "PRAZO"
          titulo: "Prazo para entrega de documentos", // Título contém "prazo", mas não conta (heurística restritiva)
          exigeEvidencia: false,
          evidenciaId: null,
        },
      ]);

      const result = await service.analyzeCriticality({
        prazoId,
        dataPrazo,
        bidId,
        empresaId,
      });

      // Não deve ser crítico (heurística restritiva: apenas category === "PRAZO")
      expect(result.isCritical).toBe(false);
      expect(result.criticalReason).toBeNull();
    });

    it("não deve identificar prazo se item crítico está concluído", async () => {
      const hoje = new Date();
      const dataPrazo = new Date(hoje);
      dataPrazo.setDate(hoje.getDate() + 30);

      const prismaClient = prismaTenant.forTenant(empresaId);
      (prismaClient.checklistItem.findMany as jest.Mock).mockResolvedValue([
        {
          id: "item-1",
          isCritical: true,
          concluido: true, // Concluído
          category: "PRAZO",
          titulo: "Prazo de entrega de propostas",
          exigeEvidencia: false,
          evidenciaId: null,
        },
      ]);

      const result = await service.analyzeCriticality({
        prazoId,
        dataPrazo,
        bidId,
        empresaId,
      });

      // Não é crítico por etapa eliminatória, mas pode ser por estar próximo do vencimento
      // Como está a 30 dias, não deve ser crítico
      expect(result.isCritical).toBe(false);
      expect(result.criticalReason).toBeNull();
    });

  });

  describe("analyzeCriticality - Documento Obrigatório Não Entregue (MISSING_REQUIRED_DOCUMENT)", () => {
    /**
     * Nota: Esta regra usa exigeEvidencia/evidenciaId como PROXY para "documento obrigatório não entregue".
     * Não há FK direta entre Prazo e Document - a relação é indireta via ChecklistItem.
     * Se o modelo evoluir para ter relação direta, esta regra deve ser revisada.
     */
    it("NÃO deve identificar quando feature flag está desabilitada (default)", async () => {
      delete process.env.PRAZO_ENABLE_CHECKLIST_HEURISTIC;

      const hoje = new Date();
      const dataPrazo = new Date(hoje);
      dataPrazo.setDate(hoje.getDate() + 30);

      const prismaClient = prismaTenant.forTenant(empresaId);
      (prismaClient.checklistItem.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.analyzeCriticality({
        prazoId,
        dataPrazo,
        bidId,
        empresaId,
      });

      expect(result.isCritical).toBe(false);
      expect(result.criticalReason).toBeNull();
      expect(prismaClient.checklistItem.findMany).not.toHaveBeenCalled();
    });

    it("deve identificar prazo associado a item que exige evidência sem documento quando flag habilitada e category=PRAZO", async () => {
      process.env.PRAZO_ENABLE_CHECKLIST_HEURISTIC = "true";

      const hoje = new Date();
      const dataPrazo = new Date(hoje);
      dataPrazo.setDate(hoje.getDate() + 30);

      const prismaClient = prismaTenant.forTenant(empresaId);
      (prismaClient.checklistItem.findMany as jest.Mock).mockResolvedValue([
        {
          id: "item-1",
          isCritical: false,
          concluido: false,
          category: "PRAZO", // category === "PRAZO" (heurística restritiva)
          titulo: "Prazo de entrega de documentos",
          exigeEvidencia: true,
          evidenciaId: null, // Sem documento
        },
      ]);

      const result = await service.analyzeCriticality({
        prazoId,
        dataPrazo,
        bidId,
        empresaId,
      });

      expect(result.isCritical).toBe(true);
      expect(result.criticalReason).toBe(CriticalReason.MISSING_REQUIRED_DOCUMENT);
    });

    it("não deve identificar prazo se item tem documento vinculado", async () => {
      const hoje = new Date();
      const dataPrazo = new Date(hoje);
      dataPrazo.setDate(hoje.getDate() + 30);

      const prismaClient = prismaTenant.forTenant(empresaId);
      (prismaClient.checklistItem.findMany as jest.Mock).mockResolvedValue([
        {
          id: "item-1",
          isCritical: false,
          concluido: false,
          category: "PRAZO",
          titulo: "Prazo de entrega de documentos",
          exigeEvidencia: true,
          evidenciaId: "doc-123", // Tem documento
        },
      ]);

      const result = await service.analyzeCriticality({
        prazoId,
        dataPrazo,
        bidId,
        empresaId,
      });

      expect(result.isCritical).toBe(false);
      expect(result.criticalReason).toBeNull();
    });

    it("não deve identificar prazo se item está concluído mesmo sem documento", async () => {
      const hoje = new Date();
      const dataPrazo = new Date(hoje);
      dataPrazo.setDate(hoje.getDate() + 30);

      const prismaClient = prismaTenant.forTenant(empresaId);
      (prismaClient.checklistItem.findMany as jest.Mock).mockResolvedValue([
        {
          id: "item-1",
          isCritical: false,
          concluido: true, // Concluído
          category: "PRAZO",
          titulo: "Prazo de entrega de documentos",
          exigeEvidencia: true,
          evidenciaId: null,
        },
      ]);

      const result = await service.analyzeCriticality({
        prazoId,
        dataPrazo,
        bidId,
        empresaId,
      });

      expect(result.isCritical).toBe(false);
      expect(result.criticalReason).toBeNull();
    });
  });

  describe("analyzeCriticality - Prioridade de Regras", () => {
    it("deve priorizar EXPIRED sobre outras regras", async () => {
      const hoje = new Date();
      const dataPrazoVencida = new Date(hoje);
      dataPrazoVencida.setDate(hoje.getDate() - 1);

      const prismaClient = prismaTenant.forTenant(empresaId);
      (prismaClient.checklistItem.findMany as jest.Mock).mockResolvedValue([
        {
          id: "item-1",
          isCritical: true,
          concluido: false,
          category: "PRAZO",
          titulo: "Prazo crítico",
          exigeEvidencia: true,
          evidenciaId: null,
        },
      ]);

      const result = await service.analyzeCriticality({
        prazoId,
        dataPrazo: dataPrazoVencida,
        bidId,
        empresaId,
      });

      expect(result.isCritical).toBe(true);
      expect(result.criticalReason).toBe(CriticalReason.EXPIRED); // Prioridade sobre outras regras
    });

    it("deve priorizar CRITICAL_CHECKLIST_PENDING sobre MISSING_REQUIRED_DOCUMENT quando flag habilitada", async () => {
      process.env.PRAZO_ENABLE_CHECKLIST_HEURISTIC = "true";

      const hoje = new Date();
      const dataPrazo = new Date(hoje);
      dataPrazo.setDate(hoje.getDate() + 30);

      const prismaClient = prismaTenant.forTenant(empresaId);
      (prismaClient.checklistItem.findMany as jest.Mock).mockResolvedValue([
        {
          id: "item-1",
          isCritical: true, // Item crítico
          concluido: false,
          category: "PRAZO",
          titulo: "Prazo crítico",
          exigeEvidencia: true,
          evidenciaId: null, // Também sem documento
        },
      ]);

      const result = await service.analyzeCriticality({
        prazoId,
        dataPrazo,
        bidId,
        empresaId,
      });

      expect(result.isCritical).toBe(true);
      expect(result.criticalReason).toBe(CriticalReason.CRITICAL_CHECKLIST_PENDING); // Prioridade sobre MISSING_REQUIRED_DOCUMENT
    });

    it("deve priorizar CRITICAL_CHECKLIST_PENDING sobre EXPIRING_SOON quando flag habilitada", async () => {
      process.env.PRAZO_ENABLE_CHECKLIST_HEURISTIC = "true";

      const hoje = new Date();
      const dataPrazo = new Date(hoje);
      dataPrazo.setDate(hoje.getDate() + CRITICAL_DAYS_THRESHOLD_DEFAULT); // Dentro do threshold

      const prismaClient = prismaTenant.forTenant(empresaId);
      (prismaClient.checklistItem.findMany as jest.Mock).mockResolvedValue([
        {
          id: "item-1",
          isCritical: true,
          concluido: false,
          category: "PRAZO",
          titulo: "Prazo crítico",
          exigeEvidencia: false,
          evidenciaId: null,
        },
      ]);

      const result = await service.analyzeCriticality({
        prazoId,
        dataPrazo,
        bidId,
        empresaId,
      });

      expect(result.isCritical).toBe(true);
      expect(result.criticalReason).toBe(CriticalReason.CRITICAL_CHECKLIST_PENDING); // Prioridade sobre EXPIRING_SOON
    });
  });

  describe("analyzeCriticality - Edge Cases de Data", () => {
    it("deve tratar 'vence hoje' (diasRestantes = 0) como EXPIRING_SOON", async () => {
      const hoje = new Date();
      const hojeUTC = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate(), 0, 0, 0, 0));

      const prismaClient = prismaTenant.forTenant(empresaId);
      (prismaClient.checklistItem.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.analyzeCriticality({
        prazoId,
        dataPrazo: hojeUTC,
        bidId,
        empresaId,
      });

      expect(result.isCritical).toBe(true);
      expect(result.criticalReason).toBe(CriticalReason.EXPIRING_SOON);
    });

    it("deve tratar '7 dias exatos' (threshold padrão) como EXPIRING_SOON", async () => {
      const hoje = new Date();
      const hojeUTC = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate(), 0, 0, 0, 0));
      const dataPrazoUTC = new Date(hojeUTC);
      dataPrazoUTC.setUTCDate(hojeUTC.getUTCDate() + CRITICAL_DAYS_THRESHOLD_DEFAULT);

      const prismaClient = prismaTenant.forTenant(empresaId);
      (prismaClient.checklistItem.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.analyzeCriticality({
        prazoId,
        dataPrazo: dataPrazoUTC,
        bidId,
        empresaId,
      });

      expect(result.isCritical).toBe(true);
      expect(result.criticalReason).toBe(CriticalReason.EXPIRING_SOON);
    });

    it("deve tratar 'ontem' (diasRestantes < 0) como EXPIRED", async () => {
      const hoje = new Date();
      const hojeUTC = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate(), 0, 0, 0, 0));
      const ontemUTC = new Date(hojeUTC);
      ontemUTC.setUTCDate(hojeUTC.getUTCDate() - 1);

      const prismaClient = prismaTenant.forTenant(empresaId);
      (prismaClient.checklistItem.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.analyzeCriticality({
        prazoId,
        dataPrazo: ontemUTC,
        bidId,
        empresaId,
      });

      expect(result.isCritical).toBe(true);
      expect(result.criticalReason).toBe(CriticalReason.EXPIRED);
    });

    it("deve tratar 'agora + 1 hora' (mesmo dia civil UTC) como EXPIRING_SOON se dentro do threshold", async () => {
      const agora = new Date();
      const hojeUTC = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate(), 0, 0, 0, 0));
      const agoraMais1hUTC = new Date(hojeUTC);
      agoraMais1hUTC.setUTCHours(agora.getUTCHours() + 1, agora.getUTCMinutes(), agora.getUTCSeconds());

      const prismaClient = prismaTenant.forTenant(empresaId);
      (prismaClient.checklistItem.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.analyzeCriticality({
        prazoId,
        dataPrazo: agoraMais1hUTC,
        bidId,
        empresaId,
      });

      // Comparação é por data civil UTC (não hora), então "hoje" = 0 dias = EXPIRING_SOON
      expect(result.isCritical).toBe(true);
      expect(result.criticalReason).toBe(CriticalReason.EXPIRING_SOON);
    });
  });

  describe("analyzeCriticality - Perda de Informação (Limitação Conhecida)", () => {
    /**
     * LIMITAÇÃO: O serviço retorna apenas criticalReason (motivo principal por prioridade).
     * Se um prazo atende múltiplas regras (ex: EXPIRING_SOON + MISSING_REQUIRED_DOCUMENT),
     * apenas a primeira por prioridade é retornada. As outras são perdidas.
     * TODO: Implementar criticalReasons[] para suportar múltiplas razões.
     */
    it("deve retornar apenas o motivo principal quando múltiplas regras se aplicam (perda de informação)", async () => {
      process.env.PRAZO_ENABLE_CHECKLIST_HEURISTIC = "true";

      const hoje = new Date();
      const hojeUTC = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate(), 0, 0, 0, 0));
      const dataPrazo = new Date(hojeUTC);
      dataPrazo.setUTCDate(hojeUTC.getUTCDate() + 3); // 3 dias (dentro do threshold padrão de 7)

      const prismaClient = prismaTenant.forTenant(empresaId);
      // Item que exige evidência sem documento (MISSING_REQUIRED_DOCUMENT)
      (prismaClient.checklistItem.findMany as jest.Mock).mockResolvedValue([
        {
          id: "item-1",
          isCritical: false,
          concluido: false,
          category: "PRAZO",
          titulo: "Prazo de entrega de documentos",
          exigeEvidencia: true,
          evidenciaId: null, // Sem documento
        },
      ]);

      const result = await service.analyzeCriticality({
        prazoId,
        dataPrazo,
        bidId,
        empresaId,
      });

      // O prazo atende AMBAS as regras:
      // - EXPIRING_SOON (3 dias <= 7)
      // - MISSING_REQUIRED_DOCUMENT (exigeEvidencia sem evidenciaId)
      // Mas apenas uma é retornada (por prioridade: MISSING_REQUIRED_DOCUMENT > EXPIRING_SOON)
      expect(result.isCritical).toBe(true);
      expect(result.criticalReason).toBe(CriticalReason.MISSING_REQUIRED_DOCUMENT);
      // LIMITAÇÃO: Não sabemos que também é EXPIRING_SOON (perda de informação)
    });
  });

  describe("analyzeMultipleCriticality", () => {
    it("deve analisar múltiplos prazos de forma eficiente", async () => {
      const hoje = new Date();
      const prazo1 = {
        id: "prazo-1",
        dataPrazo: new Date(hoje.getTime() - 24 * 60 * 60 * 1000), // Vencido
        bidId: "bid-1",
      };
      const prazo2 = {
        id: "prazo-2",
        dataPrazo: new Date(hoje.getTime() + CRITICAL_DAYS_THRESHOLD_DEFAULT * 24 * 60 * 60 * 1000), // Próximo
        bidId: "bid-2",
      };
      const prazo3 = {
        id: "prazo-3",
        dataPrazo: new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000), // Longe
        bidId: "bid-3",
      };

      const prismaClient = prismaTenant.forTenant(empresaId);
      (prismaClient.checklistItem.findMany as jest.Mock).mockImplementation((args: any) => {
        const where = args.where;
        if (where.licitacaoId === "bid-1") {
          return Promise.resolve([]);
        }
        if (where.licitacaoId === "bid-2") {
          return Promise.resolve([]);
        }
        if (where.licitacaoId === "bid-3") {
          return Promise.resolve([]);
        }
        return Promise.resolve([]);
      });

      const results = await service.analyzeMultipleCriticality(
        [prazo1, prazo2, prazo3],
        empresaId,
      );

      expect(results.get("prazo-1")?.isCritical).toBe(true);
      expect(results.get("prazo-1")?.criticalReason).toBe(CriticalReason.EXPIRED);

      expect(results.get("prazo-2")?.isCritical).toBe(true);
      expect(results.get("prazo-2")?.criticalReason).toBe(CriticalReason.EXPIRING_SOON);

      expect(results.get("prazo-3")?.isCritical).toBe(false);
      expect(results.get("prazo-3")?.criticalReason).toBeNull();
    });
  });
});
