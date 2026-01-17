import { Test, type TestingModule } from "@nestjs/testing";
import { AuditLogService } from "../audit-log.service";
import { PrismaService } from "../../prisma/prisma.service";
import { PrismaTenantService } from "../../prisma/prisma-tenant.service";

describe("AuditLogService", () => {
  let service: AuditLogService;
  let _prismaService: PrismaService;
  let _prismaTenantService: PrismaTenantService;

  // Mock do Prisma Client
  const mockPrismaClient = {
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
  };

  // Mock do PrismaTenantService
  const mockPrismaTenantService = {
    forTenant: jest.fn(() => mockPrismaClient),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: PrismaTenantService,
          useValue: mockPrismaTenantService,
        },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);

    // Limpar mocks
    jest.clearAllMocks();
  });

  describe("record", () => {
    it("deve criar um log de auditoria com sucesso", async () => {
      const input = {
        empresaId: "empresa-123",
        userId: "user-456",
        action: "auth.login",
        resourceType: "User",
        resourceId: "user-456",
        metadata: { ip: "127.0.0.1" },
        ip: "127.0.0.1",
        userAgent: "Mozilla/5.0",
      };

      const mockCreatedLog = {
        id: "log-789",
        ...input,
        createdAt: new Date(),
      };

      mockPrismaClient.auditLog.create.mockResolvedValue(mockCreatedLog);

      const result = await service.record(input);

      expect(result).toBe("log-789");
      expect(mockPrismaTenantService.forTenant).toHaveBeenCalledWith("empresa-123");
      expect(mockPrismaClient.auditLog.create).toHaveBeenCalledWith({
        data: {
          empresaId: input.empresaId,
          userId: input.userId,
          action: input.action,
          resourceType: input.resourceType,
          resourceId: input.resourceId,
          metadata: input.metadata,
          ip: input.ip,
          userAgent: input.userAgent,
        },
      });
    });

    it("deve criar log com userId null para ações do sistema", async () => {
      const input = {
        empresaId: "empresa-123",
        userId: null,
        action: "system.backup",
        resourceType: null,
        resourceId: null,
        metadata: null,
        ip: null,
        userAgent: null,
      };

      const mockCreatedLog = {
        id: "log-999",
        ...input,
        createdAt: new Date(),
      };

      mockPrismaClient.auditLog.create.mockResolvedValue(mockCreatedLog);

      const result = await service.record(input);

      expect(result).toBe("log-999");
      expect(mockPrismaClient.auditLog.create).toHaveBeenCalledWith({
        data: {
          empresaId: input.empresaId,
          userId: null,
          action: input.action,
          resourceType: null,
          resourceId: null,
          metadata: null,
          ip: null,
          userAgent: null,
        },
      });
    });
  });

  describe("list", () => {
    it("deve listar logs com paginação padrão", async () => {
      const filters = {
        empresaId: "empresa-123",
      };

      const mockLogs = [
        {
          id: "log-1",
          empresaId: "empresa-123",
          userId: "user-1",
          action: "auth.login",
          createdAt: new Date(),
        },
        {
          id: "log-2",
          empresaId: "empresa-123",
          userId: "user-2",
          action: "licitacao.create",
          createdAt: new Date(),
        },
      ];

      mockPrismaClient.auditLog.findMany.mockResolvedValue(mockLogs);
      mockPrismaClient.auditLog.count.mockResolvedValue(2);

      const result = await service.list(filters);

      expect(result.data).toHaveLength(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(50);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.totalPages).toBe(1);
      expect(mockPrismaClient.auditLog.findMany).toHaveBeenCalledWith({
        where: { empresaId: "empresa-123" },
        orderBy: { createdAt: "desc" },
        skip: 0,
        take: 50,
      });
    });

    it("deve aplicar filtros corretamente", async () => {
      const filters = {
        empresaId: "empresa-123",
        userId: "user-456",
        action: "auth.login",
        resourceType: "User",
        page: 2,
        limit: 10,
      };

      const mockLogs = [
        {
          id: "log-1",
          empresaId: "empresa-123",
          userId: "user-456",
          action: "auth.login",
          resourceType: "User",
          createdAt: new Date(),
        },
      ];

      mockPrismaClient.auditLog.findMany.mockResolvedValue(mockLogs);
      mockPrismaClient.auditLog.count.mockResolvedValue(15);

      const result = await service.list(filters);

      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.total).toBe(15);
      expect(result.pagination.totalPages).toBe(2);
      expect(mockPrismaClient.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          empresaId: "empresa-123",
          userId: "user-456",
          action: "auth.login",
          resourceType: "User",
        },
        orderBy: { createdAt: "desc" },
        skip: 10,
        take: 10,
      });
    });

    it("deve limitar máximo de 100 itens por página", async () => {
      const filters = {
        empresaId: "empresa-123",
        limit: 200, // Tentar passar mais de 100
      };

      mockPrismaClient.auditLog.findMany.mockResolvedValue([]);
      mockPrismaClient.auditLog.count.mockResolvedValue(0);

      await service.list(filters);

      expect(mockPrismaClient.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100, // Deve limitar a 100
        }),
      );
    });
  });

  describe("findOne", () => {
    it("deve buscar um log por ID com validação de tenant", async () => {
      const id = "log-123";
      const empresaId = "empresa-123";

      const mockLog = {
        id: "log-123",
        empresaId: "empresa-123",
        userId: "user-456",
        action: "auth.login",
        createdAt: new Date(),
      };

      mockPrismaClient.auditLog.findUnique.mockResolvedValue(mockLog);

      const result = await service.findOne(id, empresaId);

      expect(result).toEqual(mockLog);
      expect(mockPrismaTenantService.forTenant).toHaveBeenCalledWith(empresaId);
      expect(mockPrismaClient.auditLog.findUnique).toHaveBeenCalledWith({
        where: { id },
      });
    });
  });

  describe("Imutabilidade", () => {
    it("NÃO deve ter métodos de update", () => {
      // Verificar que o serviço não expõe métodos de update
      expect(service).not.toHaveProperty("update");
      expect(service).not.toHaveProperty("updateMany");
    });

    it("NÃO deve ter métodos de delete", () => {
      // Verificar que o serviço não expõe métodos de delete
      expect(service).not.toHaveProperty("delete");
      expect(service).not.toHaveProperty("deleteMany");
    });

    it("deve ter apenas métodos de leitura e inserção", () => {
      // Verificar que apenas métodos permitidos existem
      expect(service).toHaveProperty("record");
      expect(service).toHaveProperty("list");
      expect(service).toHaveProperty("findOne");
    });
  });
});
