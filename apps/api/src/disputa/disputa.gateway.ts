import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { type EventoDisputa } from "@prisma/client";
import { type Server, type Socket } from "socket.io";

@WebSocketGateway({ namespace: "disputa", cors: { origin: "*" } })
export class DisputaGateway {
  @WebSocketServer() server!: Server;

  handleConnection(client: Socket) {
    const disputaId = client.handshake.query.disputaId;
    if (typeof disputaId === "string" && disputaId.length > 0) {
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
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { disputaId?: string },
  ) {
    const disputaId = payload?.disputaId;
    if (typeof disputaId === "string" && disputaId.length > 0) {
      client.join(`disputa:${disputaId}`);
    }
  }
}
