import {
  DisputaStatus,
  EstrategiaLance,
  EventoDisputa,
  OrigemLanceHistorico,
  PortalLicitacao,
  ResultadoDisputa,
  StatusItemDisputa,
} from "@prisma/client";
import { NotFoundException } from "@nestjs/common";
import { DisputaService } from "./disputa.service";
import { ResultadoOperadorDisputa } from "./dto/patch-resultado-disputa.dto";

describe("DisputaService", () => {
  const senhaOriginal = "senha-super-secreta";
  const empresaId = "empresa-1";

  const disputaComCredencial = {
    id: "disputa-1",
    empresaId,
    bidId: null,
    bid: null,
    portal: PortalLicitacao.COMPRASNET,
    status: DisputaStatus.AGENDADA,
    agendadoPara: null,
    iniciadoEm: null,
    encerradoEm: null,
    numeroPregao: "NI",
    uasg: "NI",
    criadoPorId: null,
    credencialId: "cred-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    credencial: {
      id: "cred-1",
      empresaId,
      portal: PortalLicitacao.COMPRASNET,
      cnpj: "12345678000199",
      senhaHash: "abc:def",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    configuracoes: [],
  };

  let prisma: any;
  let gateway: any;
  let queue: any;
  let service: DisputaService;

  beforeEach(() => {
    process.env.ENCRYPTION_KEY = "12345678901234567890123456789012";

    prisma = {
      disputa: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      historicoLance: {
        create: jest.fn(),
      },
      configuracaoLance: {
        create: jest.fn(),
        update: jest.fn(),
        findFirst: jest.fn(),
      },
    };
    gateway = {
      emitirEvento: jest.fn(),
      emitirCanal: jest.fn(),
      server: { to: jest.fn().mockReturnThis(), emit: jest.fn() },
    };
    queue = { add: jest.fn().mockResolvedValue({}) };
    service = new DisputaService(prisma, gateway, queue);
  });

  it("criarDisputa salva com senhaHash (não texto puro)", async () => {
    prisma.disputa.create.mockResolvedValue({
      ...disputaComCredencial,
      agendadoPara: new Date("2099-12-31T10:00:00.000Z"),
    });

    await service.criarDisputa(
      {
        portal: PortalLicitacao.COMPRASNET,
        agendadoPara: "2099-12-31T10:00:00.000Z",
        credencial: { cnpj: "12345678000199", senha: senhaOriginal },
        itens: [
          {
            itemNumero: 1,
            valorMaximo: 100,
            valorMinimo: 90,
            estrategia: EstrategiaLance.CONSERVADORA,
            ativo: true,
          },
        ],
      },
      empresaId,
    );

    const createData = prisma.disputa.create.mock.calls[0][0].data;
    expect(createData.credencial.create.senhaHash).toBeDefined();
    expect(createData.credencial.create.senhaHash).not.toEqual(senhaOriginal);
    expect(queue.add).toHaveBeenCalledWith(
      "iniciar",
      { disputaId: "disputa-1" },
      expect.objectContaining({ delay: expect.any(Number) }),
    );
  });

  it("criarDisputa modo extensão não enfileira robô e credencial fica ausente", async () => {
    const disputaExt = {
      ...disputaComCredencial,
      credencialId: null,
      credencial: null,
      status: DisputaStatus.AO_VIVO,
      iniciadoEm: new Date(),
    };
    prisma.disputa.create.mockResolvedValue(disputaExt);

    await service.criarDisputa(
      {
        portal: PortalLicitacao.COMPRASNET,
        numeroPregao: "P-1",
        uasg: "U-1",
      },
      empresaId,
      "user-1",
    );

    expect(queue.add).not.toHaveBeenCalled();
    const data = prisma.disputa.create.mock.calls[0][0].data;
    expect(data.credencial).toBeUndefined();
    expect(data.numeroPregao).toBe("P-1");
    expect(data.uasg).toBe("U-1");
    expect(data.criadoPor).toEqual({ connect: { id: "user-1" } });
    expect(data.iniciadoEm).toBeInstanceOf(Date);
  });

  it("listarDisputas não retorna senhaHash", async () => {
    prisma.disputa.findMany.mockResolvedValue([disputaComCredencial]);

    const resultado = await service.listarDisputas(empresaId);

    const cred = resultado[0].credencial;
    expect(cred).not.toBeNull();
    expect(cred).toEqual(expect.objectContaining({ cnpj: "12345678000199" }));
    expect(cred).not.toHaveProperty("senhaHash");
  });

  it("listarDisputasPaginado retorna dados e paginação", async () => {
    prisma.disputa.count.mockResolvedValue(25);
    prisma.disputa.findMany.mockResolvedValue([disputaComCredencial]);

    const out = await service.listarDisputasPaginado(empresaId, { page: 2, limit: 10 });

    expect(prisma.disputa.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
      }),
    );
    expect(out.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 25,
      totalPages: 3,
    });
    expect(out.data).toHaveLength(1);
  });

  it("registrarResultadoOperador atualiza disputa e emite WS", async () => {
    prisma.disputa.findFirst.mockResolvedValue({ id: "d1", empresaId });
    prisma.disputa.update.mockResolvedValue({
      ...disputaComCredencial,
      id: "d1",
      resultado: ResultadoDisputa.GANHOU,
      status: DisputaStatus.ENCERRADA,
      encerradoEm: new Date(),
    });

    const dto = { resultado: ResultadoOperadorDisputa.GANHOU };
    await service.registrarResultadoOperador("d1", empresaId, dto);

    expect(prisma.disputa.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "d1" },
        data: expect.objectContaining({
          resultado: ResultadoDisputa.GANHOU,
          status: DisputaStatus.ENCERRADA,
        }),
      }),
    );
    expect(gateway.emitirCanal).toHaveBeenCalledWith("d1", "disputa:update", {
      tipo: "resultado",
      resultado: ResultadoOperadorDisputa.GANHOU,
      status: DisputaStatus.ENCERRADA,
    });
  });

  it("assertAcessoDisputa lança NotFound quando inexistente", async () => {
    prisma.disputa.findFirst.mockResolvedValue(null);
    await expect(service.assertAcessoDisputa("x", empresaId)).rejects.toThrow(NotFoundException);
  });

  it("aplicarSnapshotExtensao cria item, histórico EXTENSAO e emite disputa:update", async () => {
    prisma.disputa.findFirst.mockImplementation((args: { select?: { id: boolean }; include?: Record<string, unknown> }) => {
      if (args?.select?.id) {
        return Promise.resolve({ id: "d1" });
      }
      if (args?.include && "criadoPor" in args.include) {
        return Promise.resolve({
          id: "d1",
          empresaId,
          configuracoes: [],
          criadoPor: { email: "op@test.com", name: "Op" },
        });
      }
      return Promise.resolve({
        id: "d1",
        empresaId,
        configuracoes: [{ itemNumero: 1 }],
        bid: null,
        credencial: null,
      });
    });

    prisma.configuracaoLance.create.mockResolvedValue({
      id: "cfg-1",
      itemNumero: 1,
      disputaId: "d1",
      statusItem: StatusItemDisputa.AGUARDANDO,
    });
    prisma.historicoLance.create.mockResolvedValue({ id: "h1" });

    const dto = {
      disputaId: "d1",
      itens: [{ numeroItem: 1, melhorLance: 99, posicaoAtual: 1, status: StatusItemDisputa.ABERTO }],
    };

    const res = await service.aplicarSnapshotExtensao("d1", empresaId, dto);

    expect(res.ok).toBe(true);
    expect(prisma.configuracaoLance.create).toHaveBeenCalled();
    expect(prisma.historicoLance.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          origem: OrigemLanceHistorico.EXTENSAO,
          itemDisputaId: "cfg-1",
        }),
      }),
    );
    expect(gateway.emitirCanal).toHaveBeenCalledWith(
      "d1",
      "disputa:update",
      expect.objectContaining({ tipo: "snapshot" }),
    );
  });

  it("aplicarSnapshotExtensao enfileira alerta-posicao quando posicaoAtual > 1", async () => {
    prisma.disputa.findFirst.mockImplementation((args: { select?: { id: boolean }; include?: Record<string, unknown> }) => {
      if (args?.select?.id) return Promise.resolve({ id: "d1" });
      if (args?.include && "criadoPor" in args.include) {
        return Promise.resolve({
          id: "d1",
          empresaId,
          configuracoes: [],
          criadoPor: { email: "op@test.com", name: "Op" },
        });
      }
      return Promise.resolve({
        id: "d1",
        configuracoes: [],
        bid: null,
        credencial: null,
      });
    });
    prisma.configuracaoLance.create.mockResolvedValue({ id: "cfg-1", itemNumero: 1 });
    prisma.historicoLance.create.mockResolvedValue({ id: "h1" });

    await service.aplicarSnapshotExtensao("d1", empresaId, {
      disputaId: "d1",
      itens: [{ numeroItem: 1, posicaoAtual: 2 }],
    });

    expect(queue.add).toHaveBeenCalledWith(
      "alerta-posicao",
      expect.objectContaining({
        disputaId: "d1",
        posicaoAtual: 2,
        destinatarioEmail: "op@test.com",
      }),
      expect.any(Object),
    );
  });

  it("aplicarSnapshotExtensao rejeita disputaId divergente do body", async () => {
    prisma.disputa.findFirst.mockResolvedValue({ id: "d1" });
    await expect(
      service.aplicarSnapshotExtensao("d1", empresaId, {
        disputaId: "outro-id",
        itens: [],
      }),
    ).rejects.toThrow("disputaId inconsistente");
  });

  it("registrarLanceManual persiste origem MANUAL e operadorId", async () => {
    prisma.disputa.findFirst.mockResolvedValue({ id: "d1", empresaId });
    prisma.configuracaoLance.findFirst.mockResolvedValue({ id: "cfg-1" });
    prisma.historicoLance.create.mockResolvedValue({ id: "h1" });

    await service.registrarLanceManual("d1", 1, 50.5, empresaId, "u-op");

    expect(prisma.historicoLance.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          origem: OrigemLanceHistorico.MANUAL,
          operadorId: "u-op",
          valorEnviado: 50.5,
        }),
      }),
    );
  });

  it("pausarDisputa altera status corretamente", async () => {
    prisma.disputa.findFirst.mockResolvedValue({ id: "disputa-1", status: DisputaStatus.AO_VIVO });
    prisma.disputa.update.mockResolvedValue({
      ...disputaComCredencial,
      status: DisputaStatus.PAUSADA,
    });

    const resultado = await service.pausarDisputa("disputa-1", empresaId);

    expect(prisma.disputa.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "disputa-1" },
        data: { status: DisputaStatus.PAUSADA },
      }),
    );
    expect(resultado.status).toEqual(DisputaStatus.PAUSADA);
  });

  it("encerrarDisputa registra encerradoEm", async () => {
    prisma.disputa.findFirst.mockResolvedValue({ id: "disputa-1", status: DisputaStatus.AO_VIVO });
    prisma.disputa.update.mockResolvedValue({
      ...disputaComCredencial,
      status: DisputaStatus.ENCERRADA,
      encerradoEm: new Date(),
    });
    prisma.historicoLance.create.mockResolvedValue({ id: "hist-2" });

    const resultado = await service.encerrarDisputa("disputa-1", empresaId, { detalhe: "fim" });

    expect(prisma.disputa.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: DisputaStatus.ENCERRADA,
          encerradoEm: expect.any(Date),
        }),
      }),
    );
    expect(resultado.encerradoEm).toBeTruthy();
  });

  it("emitirEvento persiste no HistoricoLance", async () => {
    prisma.historicoLance.create.mockResolvedValue({ id: "hist-3" });

    await service.emitirEvento("disputa-1", EventoDisputa.LANCE_MANUAL, {
      disputaId: "disputa-1",
      evento: EventoDisputa.LANCE_MANUAL,
      itemNumero: 1,
      valorEnviado: 10,
      timestamp: new Date(),
    });

    expect(prisma.historicoLance.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          disputaId: "disputa-1",
          evento: EventoDisputa.LANCE_MANUAL,
        }),
      }),
    );
    expect(gateway.emitirEvento).toHaveBeenCalled();
  });
});
