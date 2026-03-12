import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bull";
import { DisputaStatus, EventoDisputa, type Prisma } from "@prisma/client";
import { Queue } from "bull";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { CreateDisputaDto } from "./dto/create-disputa.dto";
import { UpdateDisputaDto } from "./dto/update-disputa.dto";
import { DisputaEventoPayload } from "./interfaces/disputa-evento.interface";
import { DisputaGateway } from "./disputa.gateway";
import { GetHistoricoDisputaQueryDto } from "./dto/historico-disputa.dto";

type DisputaCompleta = Prisma.DisputaGetPayload<{
  include: {
    bid: true;
    credencial: true;
    configuracoes: true;
  };
}>;

@Injectable()
export class DisputaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly disputaGateway: DisputaGateway,
    @InjectQueue("disputa") private readonly disputaQueue: Queue,
  ) {}

  async criarDisputa(dto: CreateDisputaDto, empresaId: string) {
    const agendadoParaInput = dto.agendadoPara;
    const agendada = agendadoParaInput != null && agendadoParaInput !== undefined;
    const status = agendada ? DisputaStatus.AGENDADA : DisputaStatus.AO_VIVO;
    const agendadoPara = agendada ? new Date(agendadoParaInput as string) : null;
    if (agendadoPara && Number.isNaN(agendadoPara.getTime())) {
      throw new BadRequestException("Data de agendamento inválida");
    }

    const senhaHash = this.criptografarSenha(dto.credencial.senha);
    const configuracoes = dto.configuracoes ?? dto.itens;
    if (!configuracoes || configuracoes.length === 0) {
      throw new BadRequestException("Informe ao menos uma configuração de lance");
    }

    const disputa = await this.prisma.disputa.create({
      data: {
        empresa: {
          connect: { id: empresaId },
        },
        bid: dto.bidId
          ? {
              connect: { id: dto.bidId },
            }
          : undefined,
        portal: dto.portal,
        status,
        agendadoPara,
        credencial: {
          create: {
            empresa: {
              connect: { id: empresaId },
            },
            portal: dto.portal,
            cnpj: dto.credencial.cnpj,
            senhaHash,
          },
        },
        configuracoes: {
          create: configuracoes.map((item) => ({
            itemNumero: item.itemNumero,
            itemDescricao: item.itemDescricao,
            valorMaximo: item.valorMaximo,
            valorMinimo: item.valorMinimo,
            estrategia: item.estrategia,
            ativo: item.ativo ?? true,
          })),
        },
      },
      include: {
        bid: true,
        credencial: true,
        configuracoes: true,
      },
    });

    if (agendada) {
      const delay = Math.max(0, agendadoPara!.getTime() - Date.now());
      await this.disputaQueue.add(
        "iniciar",
        { disputaId: disputa.id },
        {
          delay,
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
    } else {
      await this.disputaQueue.add(
        "iniciar",
        { disputaId: disputa.id },
        {
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
    }

    return this.sanitizarDisputa(disputa);
  }

  async listarDisputas(empresaId: string) {
    const disputas = await this.prisma.disputa.findMany({
      where: { empresaId },
      include: {
        bid: true,
        credencial: true,
        configuracoes: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return disputas.map((disputa) => this.sanitizarDisputa(disputa));
  }

  async buscarDisputa(id: string, empresaId: string) {
    const disputa = await this.prisma.disputa.findFirst({
      where: { id, empresaId },
      include: {
        bid: true,
        credencial: true,
        configuracoes: true,
      },
    });

    if (!disputa) {
      throw new NotFoundException("Disputa não encontrada");
    }

    return this.sanitizarDisputa(disputa);
  }

  async pausarDisputa(id: string, empresaId: string) {
    const disputa = await this.prisma.disputa.findFirst({
      where: { id, empresaId },
    });
    if (!disputa) {
      throw new NotFoundException("Disputa não encontrada");
    }

    return this.prisma.disputa.update({
      where: { id },
      data: { status: DisputaStatus.PAUSADA },
    });
  }

  async retomarDisputa(id: string, empresaId: string) {
    const disputa = await this.prisma.disputa.findFirst({
      where: { id, empresaId },
    });
    if (!disputa) {
      throw new NotFoundException("Disputa não encontrada");
    }

    return this.prisma.disputa.update({
      where: { id },
      data: { status: DisputaStatus.AO_VIVO },
    });
  }

  async encerrarDisputa(id: string, empresaId?: string, dto?: UpdateDisputaDto) {
    if (empresaId) {
      await this.obterDisputaPorEmpresa(id, empresaId);
    } else {
      const disputa = await this.prisma.disputa.findUnique({ where: { id } });
      if (!disputa) {
        throw new NotFoundException("Disputa não encontrada");
      }
    }

    const atualizada = await this.prisma.disputa.update({
      where: { id },
      data: {
        status: DisputaStatus.ENCERRADA,
        encerradoEm: new Date(),
      },
      include: {
        bid: true,
        credencial: true,
        configuracoes: true,
      },
    });

    await this.emitirEvento(id, EventoDisputa.SESSAO_ENCERRADA, {
      disputaId: id,
      evento: EventoDisputa.SESSAO_ENCERRADA,
      detalhe: dto?.detalhe ?? "Sessão encerrada manualmente",
      timestamp: new Date(),
    });

    return this.sanitizarDisputa(atualizada);
  }

  async cancelarDisputa(id: string, empresaId: string) {
    const disputa = await this.obterDisputaPorEmpresa(id, empresaId);
    if (disputa.status !== DisputaStatus.AGENDADA) {
      throw new BadRequestException("Apenas disputas agendadas podem ser canceladas");
    }

    const atualizada = await this.prisma.disputa.update({
      where: { id },
      data: { status: DisputaStatus.CANCELADA },
      include: {
        bid: true,
        credencial: true,
        configuracoes: true,
      },
    });

    await this.emitirEvento(id, EventoDisputa.ERRO, {
      disputaId: id,
      evento: EventoDisputa.ERRO,
      detalhe: "Disputa cancelada antes de iniciar",
      timestamp: new Date(),
    });

    return this.sanitizarDisputa(atualizada);
  }

  async registrarLanceManual(
    disputaId: string,
    itemNumero: number,
    valor: number,
    empresaId: string,
  ) {
    if (!Number.isFinite(valor) || valor <= 0) {
      throw new BadRequestException("Valor do lance manual inválido");
    }

    const disputa = await this.prisma.disputa.findFirst({
      where: { id: disputaId, empresaId },
    });
    if (!disputa) {
      throw new NotFoundException("Disputa não encontrada");
    }

    await this.prisma.historicoLance.create({
      data: {
        disputaId,
        itemNumero,
        evento: EventoDisputa.LANCE_ENVIADO,
        valorEnviado: valor,
        detalhe: "Lance manual enviado pelo operador (origem: MANUAL)",
        timestamp: new Date(),
      },
    });

    this.disputaGateway.emitirEvento(disputaId, EventoDisputa.LANCE_ENVIADO, {
      tipo: "LANCE_ENVIADO",
      itemNumero,
      valorEnviado: valor,
      detalhe: "Lance manual enviado pelo operador",
      timestamp: new Date(),
    });
    this.disputaGateway.emitirCanal(disputaId, "disputa:evento", {
      tipo: "LANCE_ENVIADO",
      descricao: `Lance manual enviado: R$ ${valor.toFixed(2)}`,
      valor,
      itemId: String(itemNumero),
      timestamp: new Date().toISOString(),
    });

    return { ok: true };
  }

  /**
   * Histórico de disputas encerradas com filtros e paginação (F25-06)
   */
  async listarHistorico(empresaId: string, query: GetHistoricoDisputaQueryDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 && query.limit <= 100 ? query.limit : 10;
    const skip = (page - 1) * limit;

    const where: Prisma.DisputaWhereInput = {
      empresaId,
      status: { in: [DisputaStatus.ENCERRADA, DisputaStatus.CANCELADA] },
    };

    if (query.portal) {
      where.portal = query.portal;
    }

    if (query.dataInicio || query.dataFim) {
      where.iniciadoEm = {};
      if (query.dataInicio) {
        (where.iniciadoEm as Prisma.DateTimeFilter).gte = new Date(query.dataInicio);
      }
      if (query.dataFim) {
        const fim = new Date(query.dataFim);
        // incluir o dia inteiro
        fim.setHours(23, 59, 59, 999);
        (where.iniciadoEm as Prisma.DateTimeFilter).lte = fim;
      }
    }

    if (query.licitacao) {
      where.bid = {
        OR: [
          { title: { contains: query.licitacao, mode: "insensitive" } },
          { agency: { contains: query.licitacao, mode: "insensitive" } },
        ],
      };
    }

    const [total, disputas] = await Promise.all([
      this.prisma.disputa.count({ where }),
      this.prisma.disputa.findMany({
        where,
        include: {
          bid: true,
          configuracoes: true,
          historico: true,
        },
        orderBy: { iniciadoEm: "desc" },
        skip,
        take: limit,
      }),
    ]);

    const itens = disputas.map((disputa) => {
      const resumo = this.calcularMetricasHistorico(disputa);
      let resultado: "GANHOU" | "PERDEU" | "CANCELOU";
      if (disputa.status === DisputaStatus.CANCELADA) {
        resultado = "CANCELOU";
      } else if (resumo.economiaTotal > 0) {
        resultado = "GANHOU";
      } else {
        resultado = "PERDEU";
      }
      return {
        id: disputa.id,
        portal: disputa.portal,
        status: disputa.status,
        resultado,
        iniciadoEm: disputa.iniciadoEm,
        encerradoEm: disputa.encerradoEm,
        bid: disputa.bid
          ? {
              id: disputa.bid.id,
              title: disputa.bid.title,
              agency: disputa.bid.agency,
            }
          : null,
        economia: resumo.economiaTotal,
        valorMaximoTotal: resumo.valorMaximoTotal,
        melhorLanceGlobal: resumo.melhorLanceGlobal,
      };
    });

    // filtro por resultado (aplicado após cálculo de economia/resultado)
    let data = itens;
    if (query.resultado === "GANHOU") {
      data = itens.filter((i) => i.resultado === "GANHOU");
    } else if (query.resultado === "PERDEU") {
      data = itens.filter((i) => i.resultado === "PERDEU");
    } else if (query.resultado === "CANCELOU") {
      data = itens.filter((i) => i.resultado === "CANCELOU");
    }

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  /**
   * Detalhes de histórico de uma disputa encerrada (F25-06)
   */
  async buscarHistoricoDetalhe(id: string, empresaId: string) {
    const disputa = await this.prisma.disputa.findFirst({
      where: { id, empresaId, status: DisputaStatus.ENCERRADA },
      include: {
        bid: true,
        configuracoes: true,
        historico: true,
      },
    });

    if (!disputa) {
      throw new NotFoundException("Disputa encerrada não encontrada");
    }

    const metricas = this.calcularMetricasHistorico(disputa);

    const timeline = disputa.historico
      .slice()
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      .map((h) => ({
        id: h.id,
        itemNumero: h.itemNumero,
        valorEnviado: h.valorEnviado ? Number(h.valorEnviado) : null,
        melhorLance: h.melhorLance ? Number(h.melhorLance) : null,
        posicao: h.posicao,
        evento: h.evento,
        detalhe: h.detalhe,
        timestamp: h.timestamp.toISOString(),
      }));

    return {
      disputa: {
        id: disputa.id,
        portal: disputa.portal,
        status: disputa.status,
        iniciadoEm: disputa.iniciadoEm,
        encerradoEm: disputa.encerradoEm,
        bid: disputa.bid
          ? {
              id: disputa.bid.id,
              title: disputa.bid.title,
              agency: disputa.bid.agency,
            }
          : null,
      },
      metricas,
      timeline,
    };
  }

  /**
   * Gera PDF do histórico de disputa usando HTML simples (F25-06).
   */
  async gerarHistoricoPdf(id: string, empresaId: string) {
    const detalhe = await this.buscarHistoricoDetalhe(id, empresaId);

    const titulo = detalhe.disputa.bid?.title ?? "Disputa";
    const nomeArquivoBase = titulo
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 60);
    const fileName = `${nomeArquivoBase || "disputa"}_historico.pdf`;

    const html = this.montarHtmlHistorico(detalhe);

    // Importação lazy do puppeteer-core para evitar custo em testes
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const puppeteer = require("puppeteer-core") as typeof import("puppeteer-core");
    const browser = await puppeteer.launch({
      executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
      ],
      headless: true,
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });
      const pdf = await page.pdf({
        format: "A4",
        margin: { top: "20mm", right: "15mm", bottom: "20mm", left: "15mm" },
        printBackground: true,
      });
      return { buffer: Buffer.from(pdf), fileName };
    } finally {
      await browser.close();
    }
  }

  async emitirEvento(disputaId: string, evento: EventoDisputa, payload: DisputaEventoPayload) {
    const historico = await this.prisma.historicoLance.create({
      data: {
        disputaId,
        itemNumero: payload.itemNumero ?? 0,
        evento,
        valorEnviado: payload.valorEnviado,
        melhorLance: payload.melhorLance,
        posicao: payload.posicao,
        detalhe: payload.detalhe,
        timestamp: payload.timestamp ?? new Date(),
      },
    });

    this.disputaGateway.emitirEvento(disputaId, evento, payload);
    return historico;
  }

  async buscarComConfiguracoes(disputaId: string) {
    const disputa = await this.prisma.disputa.findUnique({
      where: { id: disputaId },
      include: {
        credencial: true,
        configuracoes: true,
      },
    });

    if (!disputa) {
      throw new NotFoundException("Disputa não encontrada");
    }

    return disputa;
  }

  async buscarStatus(disputaId: string) {
    const disputa = await this.prisma.disputa.findUnique({
      where: { id: disputaId },
      select: { id: true, status: true },
    });

    if (!disputa) {
      throw new NotFoundException("Disputa não encontrada");
    }

    return disputa;
  }

  /**
   * Calcula métricas agregadas da disputa a partir das configurações e do histórico.
   */
  private calcularMetricasHistorico(disputa: {
    configuracoes: { itemNumero: number; valorMaximo: Prisma.Decimal; ativo: boolean }[];
    historico: {
      itemNumero: number;
      melhorLance: Prisma.Decimal | null;
      valorEnviado: Prisma.Decimal | null;
      evento: EventoDisputa;
    }[];
    iniciadoEm: Date | null;
    encerradoEm: Date | null;
  }) {
    const ativos = disputa.configuracoes.filter((c) => c.ativo);
    const valorMaximoTotal = ativos.reduce(
      (acc, c) => acc + Number(c.valorMaximo),
      0,
    );

    const melhorPorItem = new Map<number, number>();
    let totalLancesEnviados = 0;
    let nossoUltimoLance: number | null = null;

    for (const h of disputa.historico) {
      // rastrear melhor lance por item
      if (h.melhorLance != null) {
        const atual = melhorPorItem.get(h.itemNumero);
        const valor = Number(h.melhorLance);
        if (atual == null || valor < atual) {
          melhorPorItem.set(h.itemNumero, valor);
        }
      }

      // contar lances enviados por nós (inclui LANCE_ENVIADO e LANCE_MANUAL)
      if (
        h.valorEnviado != null &&
        (h.evento === EventoDisputa.LANCE_ENVIADO || h.evento === EventoDisputa.LANCE_MANUAL)
      ) {
        totalLancesEnviados += 1;
        nossoUltimoLance = Number(h.valorEnviado);
      }
    }

    let economiaTotal = 0;
    let melhorLanceGlobal: number | null = null;

    for (const config of ativos) {
      const max = Number(config.valorMaximo);
      const melhor = melhorPorItem.get(config.itemNumero);
      if (melhor != null) {
        const economiaItem = Math.max(0, max - melhor);
        economiaTotal += economiaItem;
        if (melhorLanceGlobal == null || melhor < melhorLanceGlobal) {
          melhorLanceGlobal = melhor;
        }
      }
    }

    let duracaoSegundos: number | null = null;
    if (disputa.iniciadoEm && disputa.encerradoEm) {
      duracaoSegundos = Math.max(
        0,
        Math.round((disputa.encerradoEm.getTime() - disputa.iniciadoEm.getTime()) / 1000),
      );
    }

    return {
      valorMaximoTotal,
      economiaTotal,
      melhorLanceGlobal,
      duracaoSegundos,
      totalLancesEnviados,
      nossoUltimoLance,
    };
  }

  /**
   * Monta HTML simplificado para o relatório de histórico de disputa (F25-06).
   */
  private montarHtmlHistorico(detalhe: {
    disputa: {
      id: string;
      portal: string;
      status: DisputaStatus;
      iniciadoEm: Date | string | null;
      encerradoEm: Date | string | null;
      bid: { id: string; title: string; agency: string } | null;
    };
    metricas: {
      valorMaximoTotal: number;
      economiaTotal: number;
      melhorLanceGlobal: number | null;
      duracaoSegundos: number | null;
      totalLancesEnviados: number;
      nossoUltimoLance: number | null;
    };
    timeline: Array<{
      id: string;
      itemNumero: number;
      valorEnviado: number | null;
      melhorLance: number | null;
      posicao: number | null;
      evento: EventoDisputa;
      detalhe: string | null;
      timestamp: string;
    }>;
  }): string {
    const titulo = detalhe.disputa.bid?.title ?? "Disputa";
    const agency = detalhe.disputa.bid?.agency ?? "-";

    const dataInicio = detalhe.disputa.iniciadoEm
      ? new Date(detalhe.disputa.iniciadoEm).toLocaleString("pt-BR")
      : "-";
    const dataFim = detalhe.disputa.encerradoEm
      ? new Date(detalhe.disputa.encerradoEm).toLocaleString("pt-BR")
      : "-";

    const linhaTempo = detalhe.timeline
      .map((e) => {
        const ts = new Date(e.timestamp).toLocaleString("pt-BR");
        const valor =
          e.valorEnviado != null ? `R$ ${e.valorEnviado.toFixed(2)}` : "-";
        const melhor =
          e.melhorLance != null ? `R$ ${e.melhorLance.toFixed(2)}` : "-";
        const posicao = e.posicao != null ? `#${e.posicao}` : "-";
        return `
        <tr>
          <td>${ts}</td>
          <td>${e.itemNumero}</td>
          <td>${e.evento}</td>
          <td>${valor}</td>
          <td>${melhor}</td>
          <td>${posicao}</td>
          <td>${e.detalhe ?? ""}</td>
        </tr>`;
      })
      .join("");

    const duracao =
      detalhe.metricas.duracaoSegundos != null
        ? `${Math.floor(detalhe.metricas.duracaoSegundos / 60)} min`
        : "-";

    const nossoUltimo =
      detalhe.metricas.nossoUltimoLance != null
        ? `R$ ${detalhe.metricas.nossoUltimoLance.toFixed(2)}`
        : "-";

    return `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <style>
      body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 11px; color: #0f172a; margin: 0; padding: 24px; }
      h1 { font-size: 20px; margin-bottom: 4px; }
      h2 { font-size: 14px; margin: 16px 0 8px; }
      .muted { color: #64748b; font-size: 10px; }
      .header { margin-bottom: 16px; }
      .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 8px; }
      .card { border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; background: #f8fafc; }
      .card-label { font-size: 10px; color: #64748b; }
      .card-value { font-size: 14px; font-weight: 600; margin-top: 2px; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; }
      th, td { border: 1px solid #e2e8f0; padding: 4px 6px; text-align: left; }
      th { background: #f1f5f9; font-size: 10px; }
      td { font-size: 10px; }
    </style>
  </head>
  <body>
    <div class="header">
      <h1>Histórico da Disputa</h1>
      <div class="muted">
        <div>${titulo}</div>
        <div>${agency}</div>
        <div>Portal: ${detalhe.disputa.portal} • Status: ${detalhe.disputa.status}</div>
      </div>
    </div>

    <h2>Resumo</h2>
    <div class="grid">
      <div class="card">
        <div class="card-label">Valor máximo total</div>
        <div class="card-value">R$ ${detalhe.metricas.valorMaximoTotal.toFixed(2)}</div>
      </div>
      <div class="card">
        <div class="card-label">Economia gerada</div>
        <div class="card-value">R$ ${detalhe.metricas.economiaTotal.toFixed(2)}</div>
      </div>
      <div class="card">
        <div class="card-label">Melhor lance global</div>
        <div class="card-value">${
          detalhe.metricas.melhorLanceGlobal != null
            ? `R$ ${detalhe.metricas.melhorLanceGlobal.toFixed(2)}`
            : "-"
        }</div>
      </div>
      <div class="card">
        <div class="card-label">Início</div>
        <div class="card-value">${dataInicio}</div>
      </div>
      <div class="card">
        <div class="card-label">Término</div>
        <div class="card-value">${dataFim}</div>
      </div>
      <div class="card">
        <div class="card-label">Duração aproximada</div>
        <div class="card-value">${duracao}</div>
      </div>
      <div class="card">
        <div class="card-label">Total de lances enviados</div>
        <div class="card-value">${detalhe.metricas.totalLancesEnviados}</div>
      </div>
      <div class="card">
        <div class="card-label">Seu último lance</div>
        <div class="card-value">${nossoUltimo}</div>
      </div>
    </div>

    <h2>Linha do tempo de lances</h2>
    <table>
      <thead>
        <tr>
          <th>Data/Hora</th>
          <th>Item</th>
          <th>Evento</th>
          <th>Valor enviado</th>
          <th>Melhor lance</th>
          <th>Posição</th>
          <th>Detalhe</th>
        </tr>
      </thead>
      <tbody>
        ${linhaTempo}
      </tbody>
    </table>
  </body>
</html>`;
  }

  async atualizarStatus(disputaId: string, status: DisputaStatus) {
    const updateData: Prisma.DisputaUpdateInput = { status };
    if (status === DisputaStatus.INICIANDO) {
      updateData.iniciadoEm = new Date();
    }
    if (status === DisputaStatus.ENCERRADA) {
      updateData.encerradoEm = new Date();
    }

    return this.prisma.disputa.update({
      where: { id: disputaId },
      data: updateData,
    });
  }

  // USO INTERNO — nunca expor via REST
  descriptografarSenhaInterno(hash: string): string {
    return this.descriptografarSenha(hash);
  }

  private async obterDisputaPorEmpresa(id: string, empresaId: string) {
    const disputa = await this.prisma.disputa.findFirst({
      where: { id, empresaId },
    });
    if (!disputa) {
      throw new NotFoundException("Disputa não encontrada");
    }
    return disputa;
  }

  private criptografarSenha(valor: string): string {
    const key = this.obterChaveCriptografia();
    const iv = randomBytes(16);
    const cipher = createCipheriv("aes-256-cbc", key, iv);
    const encrypted = Buffer.concat([cipher.update(valor, "utf8"), cipher.final()]);
    return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
  }

  private descriptografarSenha(hash: string): string {
    const [ivHex, encryptedHex] = hash.split(":");
    if (!ivHex || !encryptedHex) {
      throw new InternalServerErrorException("Formato de senha criptografada inválido");
    }

    const key = this.obterChaveCriptografia();
    const iv = Buffer.from(ivHex, "hex");
    const encrypted = Buffer.from(encryptedHex, "hex");
    const decipher = createDecipheriv("aes-256-cbc", key, iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString("utf8");
  }

  private obterChaveCriptografia(): Buffer {
    const rawKey = process.env.ENCRYPTION_KEY;
    if (!rawKey || rawKey.length < 32) {
      throw new InternalServerErrorException(
        "ENCRYPTION_KEY deve possuir no mínimo 32 caracteres",
      );
    }

    return Buffer.from(rawKey.slice(0, 32), "utf8");
  }

  private sanitizarDisputa(disputa: DisputaCompleta) {
    const { credencial, ...resto } = disputa;
    const { senhaHash: _senhaHash, ...credencialSemSenha } = credencial;

    return {
      ...resto,
      credencial: credencialSemSenha,
    };
  }
}
