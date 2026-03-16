import { Injectable, BadRequestException } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bull'
import { Queue } from 'bull'
import { PrismaService } from '../prisma/prisma.service'
import { PncpAdapter } from './adapters/pncp.adapter'
import { FiltrosPregaoDto } from './dto/filtros-pregao.dto'
import { CadastrarPregaoDto } from './dto/cadastrar-pregao.dto'

@Injectable()
export class MonitoramentoService {
  constructor(
    private prisma: PrismaService,
    private pncpAdapter: PncpAdapter,
    @InjectQueue('monitoramento') private monitoramentoQueue: Queue,
  ) {}

  async listarPregoes(empresaId: string, filtros: FiltrosPregaoDto) {
    const data = filtros.data ? new Date(filtros.data) : new Date()
    const inicioDia = new Date(data)
    inicioDia.setHours(0, 0, 0, 0)
    const fimDia = new Date(data)
    fimDia.setHours(23, 59, 59, 999)

    return this.prisma.pregaoMonitorado.findMany({
      where: {
        empresaId,
        ...(filtros.portal && { portal: filtros.portal }),
        ...(filtros.status && { status: filtros.status }),
        horarioInicio: { gte: inicioDia, lte: fimDia },
      },
      orderBy: { horarioInicio: 'asc' },
    })
  }

  async buscarPregoesPncp(data?: Date) {
    return this.pncpAdapter.buscarPregoesPorData(data ?? new Date())
  }

  async cadastrarPregao(empresaId: string, dto: CadastrarPregaoDto) {
    if (!dto.url || !dto.url.startsWith('http')) {
      throw new BadRequestException('URL inválida. Informe a URL completa da sala de disputa.')
    }

    const info = await this.pncpAdapter.buscarPregaoPorUrl(dto.url)

    const pregao = await this.prisma.pregaoMonitorado.create({
      data: {
        empresaId,
        portal: info?.portal ?? 'PNCP',
        numeroPregao: info?.numeroPregao ?? dto.numeroPregao ?? '',
        objeto: info?.objeto ?? '',
        orgao: info?.orgao ?? '',
        horarioInicio: info?.horarioInicio ?? new Date(),
        urlSalaDisputa: dto.url,
        linkPncp: dto.url,
        status: 'AGUARDANDO',
      },
    })

    await this.monitoramentoQueue.add(
      'monitorar-pregao',
      { pregaoId: pregao.id, empresaId },
      { repeat: { every: 60000 }, jobId: `monitor-${pregao.id}` },
    )

    return pregao
  }

  async atualizarStatusPregao(pregaoId: string) {
    const pregao = await this.prisma.pregaoMonitorado.findUnique({ where: { id: pregaoId } })
    if (!pregao) return null

    const info = await this.pncpAdapter.buscarPregaoPorUrl(pregao.linkPncp ?? pregao.urlSalaDisputa)
    if (!info) return pregao

    const novoStatus = info.status
    if (novoStatus === pregao.status) return pregao

    return this.prisma.pregaoMonitorado.update({
      where: { id: pregaoId },
      data: { status: novoStatus, melhorLance: info.melhorLance ?? null },
    })
  }

  async removerPregao(id: string, empresaId: string) {
    const jobs = await this.monitoramentoQueue.getRepeatableJobs()
    const job = jobs.find(j => j.id === `monitor-${id}`)
    if (job) await this.monitoramentoQueue.removeRepeatableByKey(job.key)

    return this.prisma.pregaoMonitorado.delete({ where: { id, empresaId } })
  }
}
