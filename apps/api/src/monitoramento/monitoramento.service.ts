import { Injectable, BadRequestException, Logger } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bull'
import { Queue } from 'bull'
import { PrismaService } from '../prisma/prisma.service'
import { PncpAdapter } from './adapters/pncp.adapter'
import { FiltrosPregaoDto } from './dto/filtros-pregao.dto'
import { CadastrarPregaoDto } from './dto/cadastrar-pregao.dto'
import { Prisma } from '@prisma/client'

@Injectable()
export class MonitoramentoService {
  private readonly logger = new Logger(MonitoramentoService.name)

  constructor(
    private prisma: PrismaService,
    private pncpAdapter: PncpAdapter,
    @InjectQueue('monitoramento') private monitoramentoQueue: Queue,
    @InjectQueue('monitoramento-alertas') private alertasQueue: Queue,
  ) {}

  async listarPregoes(empresaId: string, filtros: FiltrosPregaoDto) {
    const deveFiltrarPorDia = Boolean(filtros.data) || !filtros.bidId
    // Atenção: `new Date("YYYY-MM-DD")` é interpretado como UTC em JS.
    // Para o filtro "do dia" funcionar no fuso local (ex.: Brasil), parseamos como data local.
    const data = filtros.data
      ? (() => {
        const [y, m, d] = filtros.data.split('-').map((v) => parseInt(v, 10))
        if (!y || !m || !d) return new Date()
        return new Date(y, m - 1, d)
      })()
      : new Date()
    const inicioDia = deveFiltrarPorDia ? new Date(data) : null
    const fimDia = deveFiltrarPorDia ? new Date(data) : null
    if (inicioDia) inicioDia.setHours(0, 0, 0, 0)
    if (fimDia) fimDia.setHours(23, 59, 59, 999)

    return this.prisma.pregaoMonitorado.findMany({
      where: {
        empresaId,
        ...(filtros.portal && { portal: filtros.portal }),
        ...(filtros.status && { status: filtros.status }),
        ...(filtros.bidId && { bidId: filtros.bidId }),
        ...(inicioDia && fimDia ? { horarioInicio: { gte: inicioDia, lte: fimDia } } : {}),
      },
      orderBy: { horarioInicio: 'asc' },
    })
  }

  async buscarPregoesPncp(data?: Date) {
    // Cache curto (dev/prod) para não travar a UI em refreshes
    const alvo = data ?? new Date()
    const key = alvo.toISOString().slice(0, 10)
    const now = Date.now()
    const ttlMs = 30_000
    const cached = (this as any)._pncpCache?.get?.(key) as { at: number; data: any[] } | undefined
    if (cached && now - cached.at < ttlMs) return cached.data

    const res = await this.pncpAdapter.buscarPregoesPorData(alvo)
    if (!(this as any)._pncpCache) (this as any)._pncpCache = new Map()
    ;(this as any)._pncpCache.set(key, { at: now, data: res })
    return res
  }

  async cadastrarPregao(empresaId: string, dto: CadastrarPregaoDto) {
    if (!dto.url || !dto.url.startsWith('http')) {
      throw new BadRequestException('URL inválida. Informe a URL completa da sala de disputa.')
    }

    const info = await this.pncpAdapter.buscarPregaoPorUrl(dto.url)
    const numeroPregao = (info?.numeroPregao ?? dto.numeroPregao ?? '').trim()

    // Vínculo manual tem prioridade; senão tenta auto-vincular por número (armazenado em Bid.title no CRM)
    let bidId: string | null = dto.bidId ?? null
    if (!bidId && numeroPregao) {
      const match = await this.prisma.bid.findFirst({
        where: {
          empresaId,
          deletedAt: null,
          title: { contains: numeroPregao, mode: 'insensitive' },
        },
        select: { id: true },
        orderBy: { createdAt: 'desc' },
      })
      bidId = match?.id ?? null
    }

    const pregao = await this.prisma.pregaoMonitorado.create({
      data: {
        empresaId,
        portal: info?.portal ?? 'PNCP',
        bidId,
        numeroPregao,
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

    // Agendar alerta por email
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { minutosAlertaPregao: true },
    })
    const minutosAntes = empresa?.minutosAlertaPregao ?? 15
    const horarioAlerta = new Date(pregao.horarioInicio)
    horarioAlerta.setMinutes(horarioAlerta.getMinutes() - minutosAntes)
    const delay = horarioAlerta.getTime() - Date.now()
    if (delay > 0) {
      await this.alertasQueue.add(
        'enviar-alerta-pregao',
        { pregaoId: pregao.id, empresaId },
        { delay, attempts: 2 },
      )
      this.logger.log(`Alerta agendado para ${minutosAntes}min antes do pregão ${pregao.id}`)
    }

    return pregao
  }

  async sugestoesVinculo(empresaId: string, numero: string) {
    const query = (numero ?? '').trim()
    if (!query) return []

    const normalize = (s: string) =>
      (s ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\/\s-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()

    const qNorm = normalize(query)
    const qTokens = new Set(qNorm.split(' ').filter((t) => t.length >= 3))
    const qNumero = (qNorm.match(/\b\d{1,6}\/\d{4}\b/) ?? [])[0] ?? null

    // Buscar candidatos (puxa mais e ranqueia em memória)
    const candidatos = await this.prisma.bid.findMany({
      where: {
        empresaId,
        deletedAt: null,
        OR: [
          { title: { contains: query, mode: Prisma.QueryMode.insensitive } },
          { agency: { contains: query, mode: Prisma.QueryMode.insensitive } },
          ...(qNumero
            ? [{ title: { contains: qNumero, mode: Prisma.QueryMode.insensitive } }]
            : []),
          ...Array.from(qTokens).slice(0, 6).map((t) => ({
            OR: [
              { title: { contains: t, mode: Prisma.QueryMode.insensitive } },
              { agency: { contains: t, mode: Prisma.QueryMode.insensitive } },
            ],
          })),
        ],
      },
      take: 50,
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, agency: true },
    })

    const scored = candidatos
      .map((b) => {
        const title = b.title ?? ''
        const agency = b.agency ?? ''
        const textNorm = normalize(`${title} ${agency}`)
        const textTokens = new Set(textNorm.split(' ').filter((t) => t.length >= 3))

        const titleNorm = normalize(title)
        const agencyNorm = normalize(agency)

        let score = 0

        // Peso forte para match de número
        if (qNumero) {
          if (titleNorm.includes(qNumero)) score += 100
          else if (textNorm.includes(qNumero)) score += 70
        }

        // Tokens em comum (Jaccard simplificado)
        if (qTokens.size > 0) {
          let inter = 0
          for (const t of qTokens) if (textTokens.has(t)) inter++
          const overlap = inter / Math.max(qTokens.size, 1)
          score += overlap * 60
        }

        // Match direto da query no título/órgão
        if (qNorm.length >= 3) {
          if (titleNorm.includes(qNorm)) score += 40
          if (agencyNorm.includes(qNorm)) score += 25
        }

        return { ...b, _score: score }
      })
      .sort((a, b) => b._score - a._score)
      .slice(0, 5)
      .map(({ _score: _ignored, ...b }) => b)

    return scored
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
