import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bull'
import { MonitoramentoController } from './monitoramento.controller'
import { MonitoramentoService } from './monitoramento.service'
import { MonitoramentoGateway } from './monitoramento.gateway'
import { MonitoramentoProcessor } from './monitoramento.processor'
import { PncpAdapter } from './adapters/pncp.adapter'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({ name: 'monitoramento' }),
  ],
  controllers: [MonitoramentoController],
  providers: [
    MonitoramentoService,
    MonitoramentoGateway,
    MonitoramentoProcessor,
    PncpAdapter,
  ],
  exports: [MonitoramentoService, MonitoramentoGateway],
})
export class MonitoramentoModule {}
