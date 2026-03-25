import { Inject, forwardRef } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from "@nestjs/websockets";
import { type EventoDisputa } from "@prisma/client";
import { type Server, type Socket } from "socket.io";
import { PrismaService } from "../prisma/prisma.service";
import { DisputaService } from "./disputa.service";
import { SnapshotExtensaoDto } from "./dto/snapshot-extensao.dto";

interface HandshakeJwtPayload {
  sub: string;
  empresaId: string;
}

@WebSocketGateway({ namespace: "disputa", cors: { origin: "*" } })
export class DisputaGateway {
  @WebSocketServer() server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => DisputaService))
    private readonly disputaService: DisputaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const authTok = client.handshake.auth?.token;
      const authHdr = client.handshake.headers.authorization;
      const qTok = client.handshake.query?.token;
      const raw =
        (typeof authTok === "string" ? authTok : null) ??
        (typeof authHdr === "string" ? authHdr.replace(/^Bearer\s+/i, "").trim() : null) ??
        (Array.isArray(qTok) ? qTok[0] : typeof qTok === "string" ? qTok : null);
      const token = raw?.trim() ? raw : null;
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwt.verify<HandshakeJwtPayload>(token);
      client.data.userId = payload.sub;
      client.data.empresaId = payload.empresaId;

      const disputaIdQ = client.handshake.query.disputaId;
      const autoJoin =
        typeof disputaIdQ === "string"
          ? disputaIdQ
          : Array.isArray(disputaIdQ)
            ? disputaIdQ[0]
            : undefined;
      if (autoJoin) {
        await this.ensureJoin(client, autoJoin);
      }
    } catch {
      client.disconnect();
    }
  }

  private async ensureJoin(client: Socket, disputaId: string) {
    const empresaId = client.data.empresaId as string | undefined;
    if (!empresaId) return;
    const ok = await this.prisma.disputa.findFirst({
      where: { id: disputaId, empresaId },
      select: { id: true },
    });
    if (ok) {
      client.join(`disputa:${disputaId}`);
    }
  }

  emitirEvento(disputaId: string, evento: EventoDisputa, payload: unknown) {
    this.server.to(`disputa:${disputaId}`).emit(evento, payload);
  }

  emitirCanal(disputaId: string, canal: string, payload: unknown) {
    this.server.to(`disputa:${disputaId}`).emit(canal, payload);
  }

  @SubscribeMessage("disputa:join")
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { disputaId?: string },
  ) {
    const disputaId = payload?.disputaId;
    if (typeof disputaId !== "string" || !disputaId.length) {
      return;
    }
    await this.ensureJoin(client, disputaId);
  }

  @SubscribeMessage("extensao:snapshot")
  async onSnapshotExtensao(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: unknown,
  ) {
    const empresaId = client.data.empresaId as string | undefined;
    if (!empresaId) {
      throw new WsException("Não autenticado");
    }
    const dto = plainToInstance(SnapshotExtensaoDto, body);
    const erros = await validate(dto);
    if (erros.length > 0) {
      throw new WsException("Payload inválido");
    }
    return this.disputaService.aplicarSnapshotExtensao(dto.disputaId, empresaId, dto);
  }

  @SubscribeMessage("disputa:preencher_lance")
  async onPreencherLance(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: Record<string, unknown>,
  ) {
    const empresaId = client.data.empresaId as string | undefined;
    if (!empresaId) {
      throw new WsException("Não autenticado");
    }
    const disputaId = body.disputaId;
    if (typeof disputaId !== "string" || !disputaId.length) {
      throw new WsException("disputaId obrigatório");
    }
    await this.disputaService.assertAcessoDisputa(disputaId, empresaId);
    this.disputaService.retransmitirPreencherLance(disputaId, body);
    return { ok: true };
  }

  @SubscribeMessage("disputa:registrar_lance")
  async onRegistrarLanceWs(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    body: { disputaId?: string; itemNumero?: number; valor?: number },
  ) {
    const empresaId = client.data.empresaId as string | undefined;
    const userId = client.data.userId as string | undefined;
    if (!empresaId || !userId) {
      throw new WsException("Não autenticado");
    }
    if (
      typeof body.disputaId !== "string" ||
      body.itemNumero == null ||
      body.valor == null
    ) {
      throw new WsException("disputaId, itemNumero e valor são obrigatórios");
    }
    return this.disputaService.registrarLanceViaRest(
      body.disputaId,
      empresaId,
      body.itemNumero,
      Number(body.valor),
      userId,
    );
  }

  @SubscribeMessage("extensao:lance_confirmado")
  async onLanceConfirmadoExtensao(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    body: {
      disputaId?: string;
      itemNumero?: number;
      valor?: number;
      posicao?: number;
    },
  ) {
    const empresaId = client.data.empresaId as string | undefined;
    if (!empresaId) {
      throw new WsException("Não autenticado");
    }
    if (
      typeof body.disputaId !== "string" ||
      body.itemNumero == null ||
      body.valor == null
    ) {
      throw new WsException("disputaId, itemNumero e valor são obrigatórios");
    }
    return this.disputaService.registrarLanceConfirmadoExtensao(body.disputaId, empresaId, {
      itemNumero: body.itemNumero,
      valor: Number(body.valor),
      posicao: body.posicao != null ? Number(body.posicao) : undefined,
    });
  }
}
