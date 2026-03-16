import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'

@WebSocketGateway({ namespace: '/monitoramento', cors: { origin: '*' } })
export class MonitoramentoGateway {
  @WebSocketServer()
  server!: Server

  @SubscribeMessage('monitoramento:join')
  handleJoin(
    @MessageBody() payload: { empresaId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`empresa:${payload.empresaId}`)
  }

  emitirUpdate(empresaId: string, pregao: any) {
    this.server.to(`empresa:${empresaId}`).emit('monitoramento:update', pregao)
  }

  emitirAlerta(empresaId: string, pregao: any) {
    this.server.to(`empresa:${empresaId}`).emit('monitoramento:alerta', pregao)
  }
}
