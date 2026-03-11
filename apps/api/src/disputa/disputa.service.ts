import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bull";
import { DisputaStatus, EventoDisputa, type Prisma } from "@prisma/client";
import { Queue } from "bull";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { CreateDisputaDto } from "./dto/create-disputa.dto";
import { UpdateDisputaDto } from "./dto/update-disputa.dto";
import { DisputaEventoPayload } from "./interfaces/disputa-evento.interface";
import { DisputaGateway } from "./disputa.gateway";

type DisputaCompleta = Prisma.DisputaGetPayload<{
  include: {
    bid: true;
    credencial: true;
    configuracoes: true;
  };
}>;

@Injectable()
export class DisputaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly disputaGateway: DisputaGateway,
    @InjectQueue("disputa") private readonly disputaQueue: Queue,
  ) {}

  async criarDisputa(dto: CreateDisputaDto, empresaId: string) {
    const agendadoParaInput = dto.agendadoPara;
    const agendada = agendadoParaInput != null && agendadoParaInput !== undefined;
    const status = agendada ? DisputaStatus.AGENDADA : DisputaStatus.AO_VIVO;
    const agendadoPara = agendada ? new Date(agendadoParaInput as string) : null;
    if (agendadoPara && Number.isNaN(agendadoPara.getTime())) {
      throw new BadRequestException("Data de agendamento inválida");
    }

    const senhaHash = this.criptografarSenha(dto.credencial.senha);
    const configuracoes = dto.configuracoes ?? dto.itens;
    if (!configuracoes || configuracoes.length === 0) {
      throw new BadRequestException("Informe ao menos uma configuração de lance");
    }

    const disputa = await this.prisma.disputa.create({
      data: {
        empresa: {
          connect: { id: empresaId },
        },
        bid: dto.bidId
          ? {
              connect: { id: dto.bidId },
            }
          : undefined,
        portal: dto.portal,
        status,
        agendadoPara,
        credencial: {
          create: {
            empresa: {
              connect: { id: empresaId },
            },
            portal: dto.portal,
            cnpj: dto.credencial.cnpj,
            senhaHash,
          },
        },
        configuracoes: {
          create: configuracoes.map((item) => ({
            itemNumero: item.itemNumero,
            itemDescricao: item.itemDescricao,
            valorMaximo: item.valorMaximo,
            valorMinimo: item.valorMinimo,
            estrategia: item.estrategia,
            ativo: item.ativo ?? true,
          })),
        },
      },
      include: {
        bid: true,
        credencial: true,
        configuracoes: true,
      },
    });

    if (agendada) {
      const delay = Math.max(0, agendadoPara!.getTime() - Date.now());
      await this.disputaQueue.add(
        "iniciar",
        { disputaId: disputa.id },
        {
          delay,
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
    } else {
      await this.disputaQueue.add(
        "iniciar",
        { disputaId: disputa.id },
        {
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
    }

    return this.sanitizarDisputa(disputa);
  }

  async listarDisputas(empresaId: string) {
    const disputas = await this.prisma.disputa.findMany({
      where: { empresaId },
      include: {
        bid: true,
        credencial: true,
        configuracoes: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return disputas.map((disputa) => this.sanitizarDisputa(disputa));
  }

  async buscarDisputa(id: string, empresaId: string) {
    const disputa = await this.prisma.disputa.findFirst({
      where: { id, empresaId },
      include: {
        bid: true,
        credencial: true,
        configuracoes: true,
      },
    });

    if (!disputa) {
      throw new NotFoundException("Disputa não encontrada");
    }

    return this.sanitizarDisputa(disputa);
  }

  async pausarDisputa(id: string, empresaId: string) {
    const disputa = await this.prisma.disputa.findFirst({
      where: { id, empresaId },
    });
    if (!disputa) {
      throw new NotFoundException("Disputa não encontrada");
    }

    return this.prisma.disputa.update({
      where: { id },
      data: { status: DisputaStatus.PAUSADA },
    });
  }

  async retomarDisputa(id: string, empresaId: string) {
    const disputa = await this.prisma.disputa.findFirst({
      where: { id, empresaId },
    });
    if (!disputa) {
      throw new NotFoundException("Disputa não encontrada");
    }

    return this.prisma.disputa.update({
      where: { id },
      data: { status: DisputaStatus.AO_VIVO },
    });
  }

  async encerrarDisputa(id: string, empresaId?: string, dto?: UpdateDisputaDto) {
    if (empresaId) {
      await this.obterDisputaPorEmpresa(id, empresaId);
    } else {
      const disputa = await this.prisma.disputa.findUnique({ where: { id } });
      if (!disputa) {
        throw new NotFoundException("Disputa não encontrada");
      }
    }

    const atualizada = await this.prisma.disputa.update({
      where: { id },
      data: {
        status: DisputaStatus.ENCERRADA,
        encerradoEm: new Date(),
      },
      include: {
        bid: true,
        credencial: true,
        configuracoes: true,
      },
    });

    await this.emitirEvento(id, EventoDisputa.SESSAO_ENCERRADA, {
      disputaId: id,
      evento: EventoDisputa.SESSAO_ENCERRADA,
      detalhe: dto?.detalhe ?? "Sessão encerrada manualmente",
      timestamp: new Date(),
    });

    return this.sanitizarDisputa(atualizada);
  }

  async cancelarDisputa(id: string, empresaId: string) {
    const disputa = await this.obterDisputaPorEmpresa(id, empresaId);
    if (disputa.status !== DisputaStatus.AGENDADA) {
      throw new BadRequestException("Apenas disputas agendadas podem ser canceladas");
    }

    const atualizada = await this.prisma.disputa.update({
      where: { id },
      data: { status: DisputaStatus.CANCELADA },
      include: {
        bid: true,
        credencial: true,
        configuracoes: true,
      },
    });

    await this.emitirEvento(id, EventoDisputa.ERRO, {
      disputaId: id,
      evento: EventoDisputa.ERRO,
      detalhe: "Disputa cancelada antes de iniciar",
      timestamp: new Date(),
    });

    return this.sanitizarDisputa(atualizada);
  }

  async registrarLanceManual(
    disputaId: string,
    itemNumero: number,
    valor: number,
    empresaId: string,
  ) {
    if (!Number.isFinite(valor) || valor <= 0) {
      throw new BadRequestException("Valor do lance manual inválido");
    }

    const disputa = await this.prisma.disputa.findFirst({
      where: { id: disputaId, empresaId },
    });
    if (!disputa) {
      throw new NotFoundException("Disputa não encontrada");
    }

    await this.prisma.historicoLance.create({
      data: {
        disputaId,
        itemNumero,
        evento: EventoDisputa.LANCE_ENVIADO,
        valorEnviado: valor,
        detalhe: "Lance manual enviado pelo operador (origem: MANUAL)",
        timestamp: new Date(),
      },
    });

    this.disputaGateway.emitirEvento(disputaId, EventoDisputa.LANCE_ENVIADO, {
      tipo: "LANCE_ENVIADO",
      itemNumero,
      valorEnviado: valor,
      detalhe: "Lance manual enviado pelo operador",
      timestamp: new Date(),
    });
    this.disputaGateway.emitirCanal(disputaId, "disputa:evento", {
      tipo: "LANCE_ENVIADO",
      descricao: `Lance manual enviado: R$ ${valor.toFixed(2)}`,
      valor,
      itemId: String(itemNumero),
      timestamp: new Date().toISOString(),
    });

    return { ok: true };
  }

  async emitirEvento(disputaId: string, evento: EventoDisputa, payload: DisputaEventoPayload) {
    const historico = await this.prisma.historicoLance.create({
      data: {
        disputaId,
        itemNumero: payload.itemNumero ?? 0,
        evento,
        valorEnviado: payload.valorEnviado,
        melhorLance: payload.melhorLance,
        posicao: payload.posicao,
        detalhe: payload.detalhe,
        timestamp: payload.timestamp ?? new Date(),
      },
    });

    this.disputaGateway.emitirEvento(disputaId, evento, payload);
    return historico;
  }

  async buscarComConfiguracoes(disputaId: string) {
    const disputa = await this.prisma.disputa.findUnique({
      where: { id: disputaId },
      include: {
        credencial: true,
        configuracoes: true,
      },
    });

    if (!disputa) {
      throw new NotFoundException("Disputa não encontrada");
    }

    return disputa;
  }

  async buscarStatus(disputaId: string) {
    const disputa = await this.prisma.disputa.findUnique({
      where: { id: disputaId },
      select: { id: true, status: true },
    });

    if (!disputa) {
      throw new NotFoundException("Disputa não encontrada");
    }

    return disputa;
  }

  async atualizarStatus(disputaId: string, status: DisputaStatus) {
    const updateData: Prisma.DisputaUpdateInput = { status };
    if (status === DisputaStatus.INICIANDO) {
      updateData.iniciadoEm = new Date();
    }
    if (status === DisputaStatus.ENCERRADA) {
      updateData.encerradoEm = new Date();
    }

    return this.prisma.disputa.update({
      where: { id: disputaId },
      data: updateData,
    });
  }

  // USO INTERNO — nunca expor via REST
  descriptografarSenhaInterno(hash: string): string {
    return this.descriptografarSenha(hash);
  }

  private async obterDisputaPorEmpresa(id: string, empresaId: string) {
    const disputa = await this.prisma.disputa.findFirst({
      where: { id, empresaId },
    });
    if (!disputa) {
      throw new NotFoundException("Disputa não encontrada");
    }
    return disputa;
  }

  private criptografarSenha(valor: string): string {
    const key = this.obterChaveCriptografia();
    const iv = randomBytes(16);
    const cipher = createCipheriv("aes-256-cbc", key, iv);
    const encrypted = Buffer.concat([cipher.update(valor, "utf8"), cipher.final()]);
    return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
  }

  private descriptografarSenha(hash: string): string {
    const [ivHex, encryptedHex] = hash.split(":");
    if (!ivHex || !encryptedHex) {
      throw new InternalServerErrorException("Formato de senha criptografada inválido");
    }

    const key = this.obterChaveCriptografia();
    const iv = Buffer.from(ivHex, "hex");
    const encrypted = Buffer.from(encryptedHex, "hex");
    const decipher = createDecipheriv("aes-256-cbc", key, iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString("utf8");
  }

  private obterChaveCriptografia(): Buffer {
    const rawKey = process.env.ENCRYPTION_KEY;
    if (!rawKey || rawKey.length < 32) {
      throw new InternalServerErrorException(
        "ENCRYPTION_KEY deve possuir no mínimo 32 caracteres",
      );
    }

    return Buffer.from(rawKey.slice(0, 32), "utf8");
  }

  private sanitizarDisputa(disputa: DisputaCompleta) {
    const { credencial, ...resto } = disputa;
    const { senhaHash: _senhaHash, ...credencialSemSenha } = credencial;

    return {
      ...resto,
      credencial: credencialSemSenha,
    };
  }
}
