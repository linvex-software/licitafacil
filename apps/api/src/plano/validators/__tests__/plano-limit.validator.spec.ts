/**
 * Testes unitários para PlanoLimitValidator
 * Validação de limite de usuários e configuração de plano (usuários extras apenas no plano Empresa)
 */

import { Test, type TestingModule } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { PlanoLimitValidator, PLANO_LIMIT_ERRORS } from "../plano-limit.validator";

describe("PlanoLimitValidator", () => {
  let validator: PlanoLimitValidator;

  const empresaId = "empresa-123";
  const planoIndividualId = "plano-individual-id";
  const planoEmpresaId = "plano-empresa-id";

  const mockEmpresaFindUnique = jest.fn();
  const mockUserCount = jest.fn();
  const mockPlanoFindUnique = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanoLimitValidator,
        {
          provide: PrismaService,
          useValue: {
            empresa: { findUnique: mockEmpresaFindUnique },
            user: { count: mockUserCount },
            plano: { findUnique: mockPlanoFindUnique },
          },
        },
      ],
    }).compile();

    validator = module.get<PlanoLimitValidator>(PlanoLimitValidator);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("validateLimiteUsuarios", () => {
    it("deve lançar NotFoundException quando empresa não existe", async () => {
      mockEmpresaFindUnique.mockResolvedValue(null);

      await expect(validator.validateLimiteUsuarios(empresaId)).rejects.toThrow(NotFoundException);
      await expect(validator.validateLimiteUsuarios(empresaId)).rejects.toThrow(
        PLANO_LIMIT_ERRORS.EMPRESA_NAO_ENCONTRADA(empresaId),
      );
    });

    it("deve lançar BadRequestException quando empresa não tem plano", async () => {
      mockEmpresaFindUnique.mockResolvedValue({
        id: empresaId,
        planoId: null,
        plano: null,
        usuariosExtrasContratados: 0,
      });

      await expect(validator.validateLimiteUsuarios(empresaId)).rejects.toThrow(BadRequestException);
      await expect(validator.validateLimiteUsuarios(empresaId)).rejects.toThrow("Empresa sem plano associado");
    });

    it("deve permitir quando plano Individual tem 0 usuários (limite 1)", async () => {
      mockEmpresaFindUnique.mockResolvedValue({
        id: empresaId,
        planoId: planoIndividualId,
        usuariosExtrasContratados: 0,
        plano: { tipo: "INDIVIDUAL", maxUsuarios: 1 },
      });
      mockUserCount.mockResolvedValue(0);

      await expect(validator.validateLimiteUsuarios(empresaId)).resolves.toBeUndefined();
    });

    it("deve lançar BadRequestException quando plano Individual já tem 1 usuário", async () => {
      mockEmpresaFindUnique.mockResolvedValue({
        id: empresaId,
        planoId: planoIndividualId,
        usuariosExtrasContratados: 0,
        plano: { tipo: "INDIVIDUAL", maxUsuarios: 1 },
      });
      mockUserCount.mockResolvedValue(1);

      await expect(validator.validateLimiteUsuarios(empresaId)).rejects.toThrow(BadRequestException);
      await expect(validator.validateLimiteUsuarios(empresaId)).rejects.toThrow(
        PLANO_LIMIT_ERRORS.LIMITE_USUARIOS_INDIVIDUAL,
      );
    });

    it("deve permitir quando plano Empresa tem 4 usuários (limite 5)", async () => {
      mockEmpresaFindUnique.mockResolvedValue({
        id: empresaId,
        planoId: planoEmpresaId,
        usuariosExtrasContratados: 0,
        plano: { tipo: "EMPRESA", maxUsuarios: 5 },
      });
      mockUserCount.mockResolvedValue(4);

      await expect(validator.validateLimiteUsuarios(empresaId)).resolves.toBeUndefined();
    });

    it("deve lançar BadRequestException quando plano Empresa já tem 5 usuários", async () => {
      mockEmpresaFindUnique.mockResolvedValue({
        id: empresaId,
        planoId: planoEmpresaId,
        usuariosExtrasContratados: 0,
        plano: { tipo: "EMPRESA", maxUsuarios: 5 },
      });
      mockUserCount.mockResolvedValue(5);

      await expect(validator.validateLimiteUsuarios(empresaId)).rejects.toThrow(BadRequestException);
      await expect(validator.validateLimiteUsuarios(empresaId)).rejects.toThrow(
        PLANO_LIMIT_ERRORS.LIMITE_USUARIOS_EMPRESA,
      );
    });

    it("deve permitir quando plano Empresa tem 5 base + 2 extras e 6 usuários", async () => {
      mockEmpresaFindUnique.mockResolvedValue({
        id: empresaId,
        planoId: planoEmpresaId,
        usuariosExtrasContratados: 2,
        plano: { tipo: "EMPRESA", maxUsuarios: 5 },
      });
      mockUserCount.mockResolvedValue(6);

      await expect(validator.validateLimiteUsuarios(empresaId)).resolves.toBeUndefined();
    });

    it("deve lançar quando plano Empresa tem 5+2 e já tem 7 usuários", async () => {
      mockEmpresaFindUnique.mockResolvedValue({
        id: empresaId,
        planoId: planoEmpresaId,
        usuariosExtrasContratados: 2,
        plano: { tipo: "EMPRESA", maxUsuarios: 5 },
      });
      mockUserCount.mockResolvedValue(7);

      await expect(validator.validateLimiteUsuarios(empresaId)).rejects.toThrow(BadRequestException);
    });
  });

  describe("validateConfigEmpresa", () => {
    it("deve lançar NotFoundException quando plano não existe", async () => {
      mockPlanoFindUnique.mockResolvedValue(null);

      await expect(validator.validateConfigEmpresa(planoIndividualId, 0)).rejects.toThrow(NotFoundException);
      await expect(validator.validateConfigEmpresa(planoIndividualId, 0)).rejects.toThrow(
        PLANO_LIMIT_ERRORS.PLANO_NAO_ENCONTRADO(planoIndividualId),
      );
    });

    it("deve lançar BadRequestException quando plano está inativo", async () => {
      mockPlanoFindUnique.mockResolvedValue({
        id: planoIndividualId,
        tipo: "INDIVIDUAL",
        ativo: false,
      });

      await expect(validator.validateConfigEmpresa(planoIndividualId, 0)).rejects.toThrow(BadRequestException);
      await expect(validator.validateConfigEmpresa(planoIndividualId, 0)).rejects.toThrow(
        PLANO_LIMIT_ERRORS.PLANO_INATIVO,
      );
    });

    it("deve permitir plano Individual com 0 usuários extras", async () => {
      mockPlanoFindUnique.mockResolvedValue({
        id: planoIndividualId,
        tipo: "INDIVIDUAL",
        ativo: true,
      });

      await expect(validator.validateConfigEmpresa(planoIndividualId, 0)).resolves.toBeUndefined();
    });

    it("deve lançar BadRequestException quando plano Individual tem usuariosExtras > 0", async () => {
      mockPlanoFindUnique.mockResolvedValue({
        id: planoIndividualId,
        tipo: "INDIVIDUAL",
        ativo: true,
      });

      await expect(validator.validateConfigEmpresa(planoIndividualId, 1)).rejects.toThrow(BadRequestException);
      await expect(validator.validateConfigEmpresa(planoIndividualId, 1)).rejects.toThrow(
        PLANO_LIMIT_ERRORS.USUARIOS_EXTRAS_APENAS_EMPRESA,
      );
    });

    it("deve permitir plano Empresa com usuariosExtras > 0", async () => {
      mockPlanoFindUnique.mockResolvedValue({
        id: planoEmpresaId,
        tipo: "EMPRESA",
        ativo: true,
      });

      await expect(validator.validateConfigEmpresa(planoEmpresaId, 3)).resolves.toBeUndefined();
    });
  });
});
