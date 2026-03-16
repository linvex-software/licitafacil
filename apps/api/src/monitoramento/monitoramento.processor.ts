import { Process, Processor } from '@nestjs/bull'
import { Job } from 'bull'
import { Logger } from '@nestjs/common'
import { MonitoramentoService } from './monitoramento.service'
import { MonitoramentoGateway } from './monitoramento.gateway'
import { PrismaService } from '../prisma/prisma.service'

@Processor('monitoramento')
export class MonitoramentoProcessor {
  private readonly logger = new Logger(MonitoramentoProcessor.name)

  constructor(
    private service: MonitoramentoService,
    private gateway: MonitoramentoGateway,
    private prisma: PrismaService,
  ) {}

  @Process('monitorar-pregao')
  async processarMonitoramento(job: Job<{ pregaoId: string; empresaId: string }>) {
    const { pregaoId, empresaId } = job.data
    this.logger.debug(`Monitorando pregão ${pregaoId}`)

    const anterior = await this.prisma.pregaoMonitorado.findUnique({ where: { id: pregaoId } })
    if (!anterior || anterior.status === 'ENCERRADO' || anterior.status === 'CANCELADO') return

    const atualizado = await this.service.atualizarStatusPregao(pregaoId)
    if (!atualizado) return

    this.gateway.emitirUpdate(empresaId, atualizado)

    if (anterior.status !== 'EM_DISPUTA' && atualizado.status === 'EM_DISPUTA') {
      this.logger.log(`🔔 Pregão ${pregaoId} entrou em disputa!`)
      this.gateway.emitirAlerta(empresaId, atualizado)
    }
  }
}
