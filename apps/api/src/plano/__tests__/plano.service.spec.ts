/**
 * Testes unitários para PlanoService
 * Listagem, busca por ID e delegação ao validador de limites
 */

import { Test, type TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { PlanoService } from "../plano.service";
import { PlanoLimitValidator } from "../validators/plano-limit.validator";

describe("PlanoService", () => {
  let service: PlanoService;
  let planoLimitValidator: jest.Mocked<Pick<PlanoLimitValidator, "validateLimiteUsuarios" | "validateConfigEmpresa">>;

  const planoId = "plano-123";
  const empresaId = "empresa-123";

  const mockPlanoFindMany = jest.fn();
  const mockPlanoFindUnique = jest.fn();
  const mockEmpresaFindUnique = jest.fn();

  beforeEach(async () => {
    planoLimitValidator = {
      validateLimiteUsuarios: jest.fn().mockResolvedValue(undefined),
      validateConfigEmpresa: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanoService,
        {
          provide: PrismaService,
          useValue: {
            plano: {
              findMany: mockPlanoFindMany,
              findUnique: mockPlanoFindUnique,
            },
            empresa: { findUnique: mockEmpresaFindUnique },
          },
        },
        {
          provide: PlanoLimitValidator,
          useValue: planoLimitValidator,
        },
      ],
    }).compile();

    service = module.get<PlanoService>(PlanoService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("deve retornar planos ativos mapeados", async () => {
      const planosPrisma = [
        {
          id: "p1",
          nome: "Individual",
          tipo: "INDIVIDUAL",
          maxEmpresas: 1,
          maxUsuarios: 1,
          precoMensal: 29.9,
          ativo: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockPlanoFindMany.mockResolvedValue(planosPrisma);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: "p1",
        nome: "Individual",
        tipo: "INDIVIDUAL",
        maxEmpresas: 1,
        maxUsuarios: 1,
        ativo: true,
      });
      expect(typeof result[0].precoMensal).toBe("number");
    });
  });

  describe("findById", () => {
    it("deve retornar plano quando existe", async () => {
      const planoPrisma = {
        id: planoId,
        nome: "Empresa",
        tipo: "EMPRESA",
        maxEmpresas: 1,
        maxUsuarios: 5,
        precoMensal: 99.9,
        ativo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPlanoFindUnique.mockResolvedValue(planoPrisma);

      const result = await service.findById(planoId);

      expect(result.id).toBe(planoId);
      expect(result.nome).toBe("Empresa");
      expect(result.tipo).toBe("EMPRESA");
      expect(result.maxUsuarios).toBe(5);
    });

    it("deve lançar NotFoundException quando plano não existe", async () => {
      mockPlanoFindUnique.mockResolvedValue(null);

      await expect(service.findById(planoId)).rejects.toThrow(NotFoundException);
      await expect(service.findById(planoId)).rejects.toThrow(`Plano com ID ${planoId} não encontrado`);
    });
  });

  describe("assertCanAddUser", () => {
    it("deve chamar o validador de limite de usuários", async () => {
      await service.assertCanAddUser(empresaId);

      expect(planoLimitValidator.validateLimiteUsuarios).toHaveBeenCalledWith(empresaId);
    });
  });

  describe("assertValidEmpresaPlanConfig", () => {
    it("deve chamar o validador de configuração de empresa", async () => {
      await service.assertValidEmpresaPlanConfig(planoId, 2);

      expect(planoLimitValidator.validateConfigEmpresa).toHaveBeenCalledWith(planoId, 2);
    });
  });
});
