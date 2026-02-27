/**
 * Testes obrigatórios para validação de validade de documentos no DocumentService
 *
 * Cobre casos críticos de produção:
 * - PATCH parcial não deixa documento em estado inválido
 * - Coerência doesExpire/expiresAt
 * - Tenant isolation
 * - Edge cases de data
 */

import { Test, type TestingModule } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { DocumentService } from "../document.service";
import type { PrismaTenantService } from "../../prisma/prisma-tenant.service";
import type { PrismaService } from "../../prisma/prisma.service";

describe("DocumentService - Validade de Documentos", () => {
  let service: DocumentService;
  let prismaTenant: jest.Mocked<PrismaTenantService>;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentService,
        {
          provide: PrismaTenantService,
          useValue: {
            forTenant: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            $transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DocumentService>(DocumentService);
    prismaTenant = module.get(PrismaTenantService);
    prisma = module.get(PrismaService);
  });

  describe("update() - Coerência de validade", () => {
    const empresaId = "tenant-1";
    const documentId = "doc-1";

    it("deve rejeitar PATCH com doesExpire=true sem expiresAt", async () => {
      const existingDoc = {
        id: documentId,
        empresaId,
        doesExpire: false,
        expiresAt: null,
        issuedAt: null,
        name: "Doc",
        category: "OUTROS",
        filename: "file.pdf",
        mimeType: "application/pdf",
        size: 1000,
        url: "/file.pdf",
        uploadedBy: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const mockPrismaTenant = {
        document: {
          findUnique: jest.fn().mockResolvedValue(existingDoc),
        },
      };

      prismaTenant.forTenant.mockReturnValue(mockPrismaTenant as any);
      prisma.$transaction.mockImplementation(async (callback) => {
        return callback({
          document: {
            update: jest.fn(),
          },
        } as any);
      });

      await expect(
        service.update(
          documentId,
          {
            doesExpire: true,
            // expiresAt não fornecido
          },
          empresaId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("deve aceitar PATCH com doesExpire=true com expiresAt", async () => {
      const existingDoc = {
        id: documentId,
        empresaId,
        doesExpire: false,
        expiresAt: null,
        issuedAt: null,
        name: "Doc",
        category: "OUTROS",
        filename: "file.pdf",
        mimeType: "application/pdf",
        size: 1000,
        url: "/file.pdf",
        uploadedBy: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const mockPrismaTenant = {
        document: {
          findUnique: jest.fn().mockResolvedValue(existingDoc),
        },
      };

      const mockUpdate = jest.fn().mockResolvedValue({
        ...existingDoc,
        doesExpire: true,
        expiresAt: futureDate,
      });

      prismaTenant.forTenant.mockReturnValue(mockPrismaTenant as any);
      prisma.$transaction.mockImplementation(async (callback) => {
        return callback({
          document: {
            update: mockUpdate,
          },
        } as any);
      });

      const result = await service.update(
        documentId,
        {
          doesExpire: true,
          expiresAt: futureDate.toISOString(),
        },
        empresaId,
      );

      expect(result.doesExpire).toBe(true);
      expect(result.expiresAt).toBeTruthy();
    });

    it("deve forçar expiresAt=null quando doesExpire=false no estado final", async () => {
      const existingDoc = {
        id: documentId,
        empresaId,
        doesExpire: true,
        expiresAt: new Date("2025-12-31"),
        issuedAt: new Date("2025-01-01"),
        name: "Doc",
        category: "OUTROS",
        filename: "file.pdf",
        mimeType: "application/pdf",
        size: 1000,
        url: "/file.pdf",
        uploadedBy: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const mockPrismaTenant = {
        document: {
          findUnique: jest.fn().mockResolvedValue(existingDoc),
        },
      };

      const mockUpdate = jest.fn().mockResolvedValue({
        ...existingDoc,
        doesExpire: false,
        expiresAt: null, // Deve ser null no estado final
      });

      prismaTenant.forTenant.mockReturnValue(mockPrismaTenant as any);
      prisma.$transaction.mockImplementation(async (callback) => {
        return callback({
          document: {
            update: mockUpdate,
          },
        } as any);
      });

      const result = await service.update(
        documentId,
        {
          doesExpire: false,
          // expiresAt pode estar no patch, mas será forçado a null
        },
        empresaId,
      );

      expect(result.doesExpire).toBe(false);
      expect(result.expiresAt).toBeNull();
      // Verificar que o update foi chamado com expiresAt=null
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            doesExpire: false,
            expiresAt: null,
          }),
        }),
      );
    });

    it("deve rejeitar PATCH que resulta em expiresAt <= issuedAt", async () => {
      const existingDoc = {
        id: documentId,
        empresaId,
        doesExpire: true,
        expiresAt: new Date("2025-12-31"),
        issuedAt: new Date("2025-01-01"),
        name: "Doc",
        category: "OUTROS",
        filename: "file.pdf",
        mimeType: "application/pdf",
        size: 1000,
        url: "/file.pdf",
        uploadedBy: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const mockPrismaTenant = {
        document: {
          findUnique: jest.fn().mockResolvedValue(existingDoc),
        },
      };

      prismaTenant.forTenant.mockReturnValue(mockPrismaTenant as any);
      prisma.$transaction.mockImplementation(async (callback) => {
        return callback({
          document: {
            update: jest.fn(),
          },
        } as any);
      });

      // expiresAt anterior a issuedAt
      await expect(
        service.update(
          documentId,
          {
            expiresAt: new Date("2024-12-31").toISOString(), // Antes de issuedAt
          },
          empresaId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("update() - Tenant Isolation", () => {
    it("deve rejeitar update de documento de outro tenant", async () => {
      const empresaId2 = "tenant-2";
      const documentId = "doc-1";

      const mockPrismaTenant = {
        document: {
          findUnique: jest.fn().mockResolvedValue(null), // Não encontra porque é outro tenant
        },
      };

      prismaTenant.forTenant.mockReturnValue(mockPrismaTenant as any);

      await expect(
        service.update(
          documentId,
          { name: "Novo Nome" },
          empresaId2, // Tentando atualizar com tenant-2
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
