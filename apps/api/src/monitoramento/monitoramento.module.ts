import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bull'
import { MonitoramentoController } from './monitoramento.controller'
import { MonitoramentoService } from './monitoramento.service'
import { MonitoramentoGateway } from './monitoramento.gateway'
import { MonitoramentoProcessor } from './monitoramento.processor'
import { MonitoramentoAlertaProcessor } from './monitoramento-alerta.processor'
import { PncpAdapter } from './adapters/pncp.adapter'
import { PrismaModule } from '../prisma/prisma.module'
import { EmailModule } from '../email/email.module'

@Module({
  imports: [
    PrismaModule,
    EmailModule,
    BullModule.registerQueue({ name: 'monitoramento' }),
    BullModule.registerQueue({ name: 'monitoramento-alertas' }),
  ],
  controllers: [MonitoramentoController],
  providers: [
    MonitoramentoService,
    MonitoramentoGateway,
    MonitoramentoProcessor,
    MonitoramentoAlertaProcessor,
    PncpAdapter,
  ],
  exports: [MonitoramentoService, MonitoramentoGateway],
})
export class MonitoramentoModule {}
