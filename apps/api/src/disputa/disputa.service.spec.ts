import { DisputaStatus, EstrategiaLance, EventoDisputa, PortalLicitacao } from "@prisma/client";
import { DisputaService } from "./disputa.service";

describe("DisputaService", () => {
  const senhaOriginal = "senha-super-secreta";
  const empresaId = "empresa-1";

  const disputaComCredencial = {
    id: "disputa-1",
    empresaId,
    bidId: null,
    portal: PortalLicitacao.COMPRASNET,
    status: DisputaStatus.AGENDADA,
    agendadoPara: null,
    iniciadoEm: null,
    encerradoEm: null,
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
      },
      historicoLance: {
        create: jest.fn(),
      },
    };
    gateway = { emitirEvento: jest.fn() };
    queue = { add: jest.fn() };
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

  it("listarDisputas não retorna senhaHash", async () => {
    prisma.disputa.findMany.mockResolvedValue([disputaComCredencial]);

    const resultado = await service.listarDisputas(empresaId);

    expect(resultado[0].credencial.senhaHash).toBeUndefined();
    expect(resultado[0].credencial.cnpj).toEqual("12345678000199");
  });

  it("pausarDisputa altera status corretamente", async () => {
    prisma.disputa.findFirst.mockResolvedValue({ id: "disputa-1", status: DisputaStatus.AO_VIVO });
    prisma.disputa.update.mockResolvedValue({
      ...disputaComCredencial,
      status: DisputaStatus.PAUSADA,
    });
    prisma.historicoLance.create.mockResolvedValue({ id: "hist-1" });

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
