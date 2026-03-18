import { Process, Processor } from '@nestjs/bull'
import { Job } from 'bull'
import { Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { EmailService } from '../email/email.service'

@Processor('monitoramento-alertas')
export class MonitoramentoAlertaProcessor {
  private readonly logger = new Logger(MonitoramentoAlertaProcessor.name)

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  @Process('enviar-alerta-pregao')
  async enviarAlerta(job: Job<{ pregaoId: string; empresaId: string }>) {
    const { pregaoId } = job.data

    const pregao = await this.prisma.pregaoMonitorado.findUnique({
      where: { id: pregaoId },
      include: {
        empresa: {
          include: {
            users: { where: { deletedAt: null }, take: 5 },
          },
        },
      },
    })

    if (!pregao || pregao.alertaEnviado) return
    if (pregao.status === 'ENCERRADO' || pregao.status === 'CANCELADO') return

    const emails = pregao.empresa.users.map((u) => u.email).filter(Boolean) as string[]
    if (emails.length === 0) return

    for (const email of emails) {
      await this.emailService.enviarAlertaPregao({
        to: email,
        numeroPregao: pregao.numeroPregao,
        objeto: pregao.objeto,
        portal: pregao.portal,
        horarioInicio: pregao.horarioInicio,
        urlSalaDisputa: pregao.urlSalaDisputa,
      })
    }

    await this.prisma.pregaoMonitorado.update({
      where: { id: pregaoId },
      data: { alertaEnviado: true },
    })

    this.logger.log(`Alerta enviado para pregão ${pregaoId} — ${emails.length} email(s)`)
  }
}
