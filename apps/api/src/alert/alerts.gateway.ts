import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Server } from "socket.io";
import type { Alert } from "@licitafacil/shared";

const EMPRESA_ROOM_PREFIX = "empresa:";

@WebSocketGateway({
  cors: { origin: ["http://localhost:3000", "http://localhost:3002"] },
  namespace: "/alerts-ws",
})
export class AlertsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(AlertsGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: any) {
    try {
      const token =
        client.handshake?.auth?.token ?? client.handshake?.query?.token;
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || "your-secret-key-change-in-production",
      });
      const empresaId = payload?.empresaId;
      if (!empresaId) {
        client.disconnect();
        return;
      }
      const room = `${EMPRESA_ROOM_PREFIX}${empresaId}`;
      await client.join(room);
      this.logger.debug(`Client ${client.id} joined ${room}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: any) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  /**
   * Emite um novo alerta para todos os clientes da empresa (single server, sem Redis).
   */
  emitNewAlert(empresaId: string, alert: Alert): void {
    const room = `${EMPRESA_ROOM_PREFIX}${empresaId}`;
    this.server.to(room).emit("alert", alert);
  }
}
