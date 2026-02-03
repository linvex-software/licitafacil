/**
 * Testes de integração: fluxo Empresa + Plano
 * Valida que criar empresa com plano e limites de usuários respeita as regras de negócio.
 */

import { Test, type TestingModule } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { PrismaTenantService } from "../../prisma/prisma-tenant.service";
import { PrismaModule } from "../../prisma/prisma.module";
import { PlanoModule } from "../plano.module";
import { EmpresaModule } from "../../empresa/empresa.module";
import { EmpresaService } from "../../empresa/empresa.service";
import { UserService } from "../../user/user.service";
import { UserModule } from "../../user/user.module";

const PLANO_INDIVIDUAL_ID = "00000000-0000-0000-0000-000000000010";
const PLANO_EMPRESA_ID = "00000000-0000-0000-0000-000000000011";

describe("Plano / Empresa / User - Integração", () => {
  let empresaService: EmpresaService;
  let userService: UserService;

  const mockEmpresaCreate = jest.fn();
  const mockEmpresaFindUnique = jest.fn();
  const mockPlanoFindUnique = jest.fn();
  const mockPlanoFindMany = jest.fn();
  const mockUserCount = jest.fn();
  const mockUserFindUnique = jest.fn();
  const mockUserCreate = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule, PlanoModule, EmpresaModule, UserModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        empresa: {
          create: mockEmpresaCreate,
          findUnique: mockEmpresaFindUnique,
        },
        plano: {
          findUnique: mockPlanoFindUnique,
          findMany: mockPlanoFindMany,
        },
        user: {
          count: mockUserCount,
          findUnique: mockUserFindUnique,
          findFirst: jest.fn(),
          create: mockUserCreate,
        },
      })
      .overrideProvider(PrismaTenantService)
      .useValue({
        forTenant: jest.fn().mockReturnValue({
          user: {
            findMany: jest.fn().mockResolvedValue([]),
            findUnique: mockUserFindUnique,
            create: mockUserCreate,
          },
        }),
      })
      .compile();

    empresaService = module.get<EmpresaService>(EmpresaService);
    userService = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Criar empresa com plano", () => {
    it("deve rejeitar criação de empresa com plano Individual e usuariosExtrasContratados > 0", async () => {
      mockPlanoFindUnique.mockResolvedValue({
        id: PLANO_INDIVIDUAL_ID,
        tipo: "INDIVIDUAL",
        ativo: true,
      });

      await expect(
        empresaService.create({
          name: "Minha Empresa",
          planoId: PLANO_INDIVIDUAL_ID,
          usuariosExtrasContratados: 1,
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        empresaService.create({
          name: "Minha Empresa",
          planoId: PLANO_INDIVIDUAL_ID,
          usuariosExtrasContratados: 1,
        }),
      ).rejects.toThrow("Usuários extras só são permitidos no plano Empresa");

      expect(mockEmpresaCreate).not.toHaveBeenCalled();
    });

    it("deve rejeitar quando plano não existe", async () => {
      mockPlanoFindUnique.mockResolvedValue(null);

      await expect(
        empresaService.create({
          name: "Minha Empresa",
          planoId: "plano-inexistente",
          usuariosExtrasContratados: 0,
        }),
      ).rejects.toThrow(NotFoundException);

      expect(mockEmpresaCreate).not.toHaveBeenCalled();
    });

    it("deve permitir criação com plano Empresa e usuariosExtrasContratados", async () => {
      mockPlanoFindUnique.mockResolvedValue({
        id: PLANO_EMPRESA_ID,
        tipo: "EMPRESA",
        ativo: true,
      });
      mockEmpresaCreate.mockResolvedValue({
        id: "empresa-nova",
        name: "Empresa com Extras",
        planoId: PLANO_EMPRESA_ID,
        usuariosExtrasContratados: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await empresaService.create({
        name: "Empresa com Extras",
        planoId: PLANO_EMPRESA_ID,
        usuariosExtrasContratados: 2,
      });

      expect(result.name).toBe("Empresa com Extras");
      expect(result.planoId).toBe(PLANO_EMPRESA_ID);
      expect(result.usuariosExtrasContratados).toBe(2);
      expect(mockEmpresaCreate).toHaveBeenCalledWith({
        data: {
          name: "Empresa com Extras",
          planoId: PLANO_EMPRESA_ID,
          usuariosExtrasContratados: 2,
        },
      });
    });
  });

  describe("Criar usuário (limite do plano)", () => {
    const empresaId = "empresa-123";

    it("deve rejeitar novo usuário quando plano Individual já tem 1 usuário", async () => {
      mockEmpresaFindUnique.mockResolvedValue({
        id: empresaId,
        planoId: PLANO_INDIVIDUAL_ID,
        usuariosExtrasContratados: 0,
        plano: { tipo: "INDIVIDUAL", maxUsuarios: 1 },
      });
      mockUserCount.mockResolvedValue(1);

      await expect(
        userService.create({
          email: "novo@teste.com",
          password: "senha123",
          name: "Novo User",
          empresaId,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockUserCreate).not.toHaveBeenCalled();
    });

    it("deve permitir primeiro usuário quando plano Individual (limite 1)", async () => {
      mockEmpresaFindUnique.mockResolvedValue({
        id: empresaId,
        planoId: PLANO_INDIVIDUAL_ID,
        usuariosExtrasContratados: 0,
        plano: { tipo: "INDIVIDUAL", maxUsuarios: 1 },
      });
      mockUserCount.mockResolvedValue(0);
      mockUserFindUnique.mockResolvedValue(null);
      mockUserCreate.mockResolvedValue({
        id: "user-1",
        email: "unico@teste.com",
        name: "Único User",
        role: "COLABORADOR",
        empresaId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await userService.create({
        email: "unico@teste.com",
        password: "senha123",
        name: "Único User",
        empresaId,
      });

      expect(result.email).toBe("unico@teste.com");
      expect(mockUserCreate).toHaveBeenCalled();
    });
  });
});
