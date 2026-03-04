import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaTenantService } from "../prisma/prisma-tenant.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  AutorTipo,
  EfeitoRecurso,
  EscopoImpugnacao,
  StatusPeticao,
  TipoEventoLicitacao,
  TipoPeticao,
} from "@prisma/client";
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import * as fs from "fs/promises";
import * as path from "path";
import { createHash } from "crypto";
import { EventoLicitacaoService } from "../bid/evento-licitacao.service";

type DadosPeticao = {
  userId: string;
  conteudo: string;
  nomeEmpresa?: string;
  cnpj?: string;
  endereco?: string;
  cidade?: string;
  escopoImpugnacao?: EscopoImpugnacao;
  efeitoRecurso?: EfeitoRecurso;
  anonimo?: boolean;
  autorTipo?: AutorTipo;
  motivoIntencao?: string;
  itensContestados?: string[];
};

@Injectable()
export class JuridicoService {
  private readonly logger = new Logger(JuridicoService.name);

  constructor(
    private readonly prismaTenant: PrismaTenantService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly eventoService: EventoLicitacaoService,
  ) {}

  async gerarPeticao(
    bidId: string,
    tipo: TipoPeticao,
    dados: DadosPeticao,
    empresaId: string,
  ) {
    this.logger.log(`gerarPeticao — bidId: ${bidId}, empresaId: ${empresaId}`);

    const prismaWithTenant = this.prismaTenant.forTenant(empresaId);
    const bid = await prismaWithTenant.bid.findUnique({
      where: { id: bidId },
      include: {
        empresa: {
          select: { name: true },
        },
      },
    });

    if (!bid) {
      this.logger.warn(`Licitação não encontrada no tenant. bidId=${bidId} empresaId=${empresaId}`);
      throw new NotFoundException("Licitação não encontrada");
    }

    const user = await this.prisma.user.findFirst({
      where: { id: dados.userId, empresaId, deletedAt: null },
      include: {
        empresa: {
          select: { id: true, name: true },
        },
      },
    });
    const clienteConfig = await this.prisma.clienteConfig.findUnique({
      where: { empresaId },
      select: { cnpj: true },
    });

    const conteudo = (dados.conteudo || "").trim();
    if (!conteudo) {
      throw new BadRequestException("Conteúdo da petição é obrigatório");
    }
    if (tipo === TipoPeticao.INTENCAO_RECURSO && !dados.motivoIntencao?.trim()) {
      throw new BadRequestException(
        "A intenção de recurso requer motivação explícita. Fundamentação genérica gera recusa pelo pregoeiro.",
      );
    }

    const now = new Date();
    const nomeArquivo = this.buildFileName(tipo, bid.title, now);
    const empresaNome = this.resolverNomeEmpresa({
      nomeEmpresaUsuario: user?.empresa?.name,
      nomeEmpresaBid: bid.empresa?.name,
      nomeEmpresaDto: dados.nomeEmpresa,
      nomeUsuario: user?.name,
    });
    const cnpj = dados.cnpj?.trim() || clienteConfig?.cnpj || "";
    const endereco = dados.endereco?.trim() || "";
    const cidade = dados.cidade?.trim() || "Cidade/UF";

    const peticao = await prismaWithTenant.peticao.create({
      data: {
        empresaId,
        bidId,
        tipo,
        conteudo,
        nomeArquivo,
        status: StatusPeticao.RASCUNHO,
        escopoImpugnacao: dados.escopoImpugnacao,
        efeitoRecurso: dados.efeitoRecurso ?? EfeitoRecurso.NAO_APLICA,
        anonimo: dados.anonimo ?? false,
        autorTipo: dados.autorTipo ?? AutorTipo.CONCORRENTE,
        motivoIntencao: dados.motivoIntencao?.trim() || null,
        itensContestados: dados.itensContestados?.length
          ? JSON.stringify(dados.itensContestados)
          : null,
      },
    });

    const codigoAutenticidade = this.gerarCodigoAutenticidade(peticao.id, bidId);
    const urlVerificacao = this.gerarUrlVerificacao(codigoAutenticidade);

    const peticaoAtualizada = await prismaWithTenant.peticao.update({
      where: { id: peticao.id },
      data: { codigoAutenticidade },
    });
    this.logger.debug(`Código salvo: ${peticaoAtualizada.codigoAutenticidade}`);

    const documentFinal = this.buildDocument({
      tipo,
      conteudo,
      empresaNome,
      numeroLicitacao: bid.title,
      orgao: bid.agency,
      cidade,
      cnpj,
      endereco,
      data: now,
      codigoAutenticidade,
      urlVerificacao,
      escopoImpugnacao: dados.escopoImpugnacao,
      itensContestados: dados.itensContestados,
    });
    const buffer = await Packer.toBuffer(documentFinal);
    await this.ensureTemplateFile(tipo, documentFinal);

    const tipoEvento = this.mapPeticaoToEvento(tipo);
    if (tipoEvento) {
      await this.eventoService.registrar(bidId, tipoEvento, {
        peticaoId: peticao.id,
        autorTipo: dados.autorTipo ?? AutorTipo.CONCORRENTE,
        anonimo: dados.anonimo ?? false,
      });
    }

    if (tipo === TipoPeticao.RECURSO && dados.efeitoRecurso === EfeitoRecurso.SUSPENSIVO) {
      await prismaWithTenant.bid.update({
        where: { id: bidId },
        data: {
          operationalState: "SUSPENSA",
          isVencedorProvisorio: true,
        },
      });
      await this.eventoService.registrar(bidId, TipoEventoLicitacao.SUSPENSA_POR_RECURSO, {
        peticaoId: peticao.id,
      });
    }

    return {
      buffer,
      nomeArquivo,
      peticao,
    };
  }

  async listarPeticoes(bidId: string, empresaId: string) {
    const prismaWithTenant = this.prismaTenant.forTenant(empresaId);
    return prismaWithTenant.peticao.findMany({
      where: { bidId },
      orderBy: { createdAt: "desc" },
    });
  }

  async verificarAutenticidade(codigo: string) {
    const codigoNormalizado = codigo.toUpperCase().trim();
    this.logger.debug(`Buscando código: ${codigoNormalizado}`);

    const peticao = await this.prisma.peticao.findFirst({
      where: { codigoAutenticidade: codigoNormalizado },
      include: {
        bid: {
          select: {
            title: true,
            empresa: { select: { name: true } },
          },
        },
      },
    });
    this.logger.debug(`Petição encontrada: ${peticao?.id ?? "não encontrada"}`);

    if (!peticao) return null;

    return {
      tipo: peticao.tipo,
      codigoAutenticidade: peticao.codigoAutenticidade,
      createdAt: peticao.createdAt,
      licitacaoTitulo: peticao.bid?.title ?? "Não informado",
      empresaNome: peticao.bid?.empresa?.name ?? "Não informado",
    };
  }

  async atualizarStatusPeticao(
    id: string,
    status: StatusPeticao,
    empresaId: string,
  ) {
    const prismaWithTenant = this.prismaTenant.forTenant(empresaId);
    const peticao = await prismaWithTenant.peticao.findUnique({
      where: { id },
    });

    if (!peticao) {
      throw new NotFoundException("Petição não encontrada");
    }

    return prismaWithTenant.peticao.update({
      where: { id },
      data: {
        status,
        ...(status === StatusPeticao.ENVIADO ? { dataEnvio: new Date() } : { dataEnvio: null }),
      },
    });
  }

  private buildDocument(input: {
    tipo: TipoPeticao;
    conteudo: string;
    empresaNome: string;
    numeroLicitacao: string;
    orgao: string;
    cidade: string;
    cnpj: string;
    endereco: string;
    data: Date;
    codigoAutenticidade: string;
    urlVerificacao: string;
    escopoImpugnacao?: EscopoImpugnacao;
    itensContestados?: string[];
  }) {
    const titulo = this.getTitulo(input.tipo);
    const secoes = this.getSecoes(input.tipo);
    const dataFormatada = this.formatDatePtBr(input.data);
    const cabecalho = this.buildCabecalho();
    const assinatura = this.buildAssinatura({
      cidade: input.cidade,
      dataFormatada,
      empresaNome: input.empresaNome,
      cnpj: input.cnpj,
    });
    const rodape = this.buildRodape({
      codigoAutenticidade: input.codigoAutenticidade,
      urlVerificacao: input.urlVerificacao,
      generatedAt: input.data,
    });

    return new Document({
      styles: {
        default: {
          document: {
            run: {
              font: "Arial",
              size: 22,
            },
            paragraph: {
              spacing: {
                line: 320,
              },
            },
          },
        },
      },
      sections: [
        {
          properties: {
            page: {
              size: {
                width: 11906,
                height: 16838,
              },
              margin: {
                top: 1701,
                right: 1134,
                bottom: 1134,
                left: 1701,
              },
            },
          },
          children: [
            ...cabecalho,
            new Paragraph({
              children: [new TextRun({ text: `À ${input.orgao}`, bold: true })],
            }),
            new Paragraph({
              spacing: { before: 200, after: 240 },
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: titulo, bold: true, size: 26, color: "0F172A" })],
            }),
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 240, after: 120 },
              children: [new TextRun({ text: secoes.identificacao, bold: true })],
            }),
            new Paragraph({
              children: [new TextRun({ text: `Empresa: ${input.empresaNome}` })],
            }),
            new Paragraph({
              children: [new TextRun({ text: `CNPJ: ${input.cnpj}` })],
            }),
            new Paragraph({
              children: [new TextRun({ text: `Endereço: ${input.endereco}` })],
            }),
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 240, after: 120 },
              children: [new TextRun({ text: secoes.objeto, bold: true })],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Refere-se ao processo licitatório "${input.numeroLicitacao}" do órgão ${input.orgao}.`,
                }),
              ],
            }),
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 240, after: 120 },
              children: [new TextRun({ text: secoes.conteudoTitulo, bold: true })],
            }),
            ...this.buildEscopoImpugnacaoParagraphs(
              input.tipo,
              input.escopoImpugnacao,
              input.itensContestados,
            ),
            ...this.getConteudoParagraphs(input.conteudo),
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 240, after: 120 },
              children: [new TextRun({ text: secoes.pedidoTitulo, bold: true })],
            }),
            new Paragraph({
              children: [new TextRun({ text: secoes.pedidoTexto })],
            }),
            ...assinatura,
            ...rodape,
          ],
        },
      ],
    });
  }

  private getConteudoParagraphs(conteudo: string): Paragraph[] {
    const lines = conteudo
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      return [new Paragraph({ children: [new TextRun({ text: "Conteúdo não informado." })] })];
    }

    return lines.map((line) => new Paragraph({ children: [new TextRun({ text: line })] }));
  }

  private getTitulo(tipo: TipoPeticao): string {
    switch (tipo) {
      case TipoPeticao.IMPUGNACAO:
        return "IMPUGNAÇÃO AO EDITAL";
      case TipoPeticao.ESCLARECIMENTO:
        return "PEDIDO DE ESCLARECIMENTO";
      case TipoPeticao.RECURSO:
        return "RECURSO ADMINISTRATIVO";
      case TipoPeticao.INTENCAO_RECURSO:
        return "MANIFESTAÇÃO DE INTENÇÃO DE RECURSO";
      case TipoPeticao.CONTRA_RAZAO:
        return "CONTRARRAZÕES AO RECURSO";
      default:
        return "PETIÇÃO ADMINISTRATIVA";
    }
  }

  private getSecoes(tipo: TipoPeticao) {
    const comum = {
      identificacao: "I – DA IDENTIFICAÇÃO",
      objeto: "II – DO OBJETO",
    };

    switch (tipo) {
      case TipoPeticao.IMPUGNACAO:
        return {
          ...comum,
          conteudoTitulo: "III – DA FUNDAMENTAÇÃO",
          pedidoTitulo: "IV – DO PEDIDO",
          pedidoTexto:
            "Diante do exposto, requer-se o acolhimento da presente impugnação, com a devida retificação do edital.",
        };
      case TipoPeticao.ESCLARECIMENTO:
        return {
          ...comum,
          conteudoTitulo: "III – DOS QUESTIONAMENTOS",
          pedidoTitulo: "IV – DO PEDIDO",
          pedidoTexto:
            "Requer-se o devido esclarecimento dos pontos levantados, para garantir transparência e isonomia do certame.",
        };
      case TipoPeticao.RECURSO:
        return {
          ...comum,
          conteudoTitulo: "III – DAS RAZÕES DO RECURSO",
          pedidoTitulo: "IV – DO PEDIDO DE RECONSIDERAÇÃO",
          pedidoTexto:
            "Diante das razões expostas, requer-se a reconsideração da decisão recorrida, com o provimento do presente recurso.",
        };
      case TipoPeticao.INTENCAO_RECURSO:
        return {
          ...comum,
          conteudoTitulo: "III – DA MOTIVAÇÃO",
          pedidoTitulo: "IV – DO PEDIDO DE PRAZO",
          pedidoTexto:
            "Requer-se a concessão do prazo legal para apresentação das razões recursais, nos termos da legislação aplicável.",
        };
      case TipoPeticao.CONTRA_RAZAO:
        return {
          ...comum,
          conteudoTitulo: "III – DAS CONTRARRAZÕES",
          pedidoTitulo: "IV – DO PEDIDO",
          pedidoTexto:
            "Diante dos fundamentos apresentados, requer-se a manutenção da decisão administrativa anteriormente proferida.",
        };
      default:
        return {
          ...comum,
          conteudoTitulo: "III – DO CONTEÚDO",
          pedidoTitulo: "IV – DO PEDIDO",
          pedidoTexto: "Requer-se o acolhimento da presente petição.",
        };
    }
  }

  private buildFileName(tipo: TipoPeticao, numeroLicitacao: string, date: Date) {
    const normalizedNumero = numeroLicitacao
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 60);
    const yyyyMmDd = date.toISOString().slice(0, 10);
    return `peticao_${tipo}_${normalizedNumero}_${yyyyMmDd}.docx`;
  }

  private gerarCodigoAutenticidade(peticaoId: string, bidId: string): string {
    const payload = `${peticaoId}-${bidId}-${Date.now()}`;
    return createHash("sha256").update(payload).digest("hex").substring(0, 16).toUpperCase();
  }

  private gerarUrlVerificacao(codigo: string): string {
    const baseUrl = this.config.get<string>("FRONTEND_URL") ?? "http://localhost:3000";
    return `${baseUrl}/verificar/${codigo}`;
  }

  private mapPeticaoToEvento(tipo: TipoPeticao): TipoEventoLicitacao | null {
    const map: Record<TipoPeticao, TipoEventoLicitacao> = {
      IMPUGNACAO: TipoEventoLicitacao.IMPUGNACAO_RECEBIDA,
      ESCLARECIMENTO: TipoEventoLicitacao.ESCLARECIMENTO_PUBLICADO,
      INTENCAO_RECURSO: TipoEventoLicitacao.INTENCAO_RECURSO_REGISTRADA,
      RECURSO: TipoEventoLicitacao.RECURSO_INTERPOSTO,
      CONTRA_RAZAO: TipoEventoLicitacao.CONTRA_RAZOES_APRESENTADAS,
    };
    return map[tipo] ?? null;
  }

  private formatDatePtBr(date: Date) {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  }

  private buildCabecalho(): Paragraph[] {
    return [
      new Paragraph({
        children: [
          new TextRun({
            text: "LIMVEX LICITAÇÃO",
            bold: true,
            size: 20,
            color: "0078D1",
            font: "Arial",
          }),
        ],
        alignment: AlignmentType.LEFT,
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "Plataforma de Gestão de Licitações Públicas",
            size: 16,
            color: "64748B",
            font: "Arial",
          }),
        ],
      }),
      new Paragraph({
        children: [new TextRun({ text: "_".repeat(80), color: "E2E8F0" })],
        spacing: { after: 400 },
      }),
    ];
  }

  private buildAssinatura(input: {
    cidade: string;
    dataFormatada: string;
    empresaNome: string;
    cnpj: string;
  }): Paragraph[] {
    return [
      new Paragraph({
        spacing: { before: 600 },
        children: [
          new TextRun({
            text: `${input.cidade || "Cidade/UF"}, ${input.dataFormatada}`,
            size: 20,
            font: "Arial",
          }),
        ],
      }),
      new Paragraph({ spacing: { before: 800 } }),
      new Paragraph({
        children: [
          new TextRun({
            text: input.empresaNome || "[Nome da Empresa]",
            bold: true,
            size: 22,
            font: "Arial",
          }),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: input.cnpj ? `CNPJ: ${input.cnpj}` : "",
            size: 18,
            font: "Arial",
            color: "64748B",
          }),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "Representante Legal",
            size: 18,
            font: "Arial",
            color: "64748B",
          }),
        ],
        spacing: { after: 600 },
      }),
    ];
  }

  private buildRodape(input: {
    codigoAutenticidade: string;
    urlVerificacao: string;
    generatedAt: Date;
  }): Paragraph[] {
    return [
      new Paragraph({
        children: [new TextRun({ text: "_".repeat(80), color: "E2E8F0" })],
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "Documento gerado pela plataforma Limvex Licitação · ",
            size: 14,
            color: "94A3B8",
            font: "Arial",
          }),
          new TextRun({
            text: "limvex.com",
            size: 14,
            color: "0078D1",
            font: "Arial",
          }),
        ],
        spacing: { before: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "Código de autenticidade: ",
            size: 14,
            color: "94A3B8",
            font: "Arial",
          }),
          new TextRun({
            text: input.codigoAutenticidade,
            size: 14,
            color: "334155",
            bold: true,
            font: "Courier New",
          }),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Verifique em: ${input.urlVerificacao}`,
            size: 14,
            color: "0078D1",
            font: "Arial",
          }),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Gerado em: ${input.generatedAt.toLocaleString("pt-BR")}`,
            size: 14,
            color: "94A3B8",
            font: "Arial",
          }),
        ],
      }),
    ];
  }

  private buildEscopoImpugnacaoParagraphs(
    tipo: TipoPeticao,
    escopoImpugnacao?: EscopoImpugnacao,
    itensContestados?: string[],
  ): Paragraph[] {
    if (tipo !== TipoPeticao.IMPUGNACAO || escopoImpugnacao !== EscopoImpugnacao.PARCIAL) {
      return [];
    }

    const itensFormatados = (itensContestados ?? []).map((item) => item.trim()).filter(Boolean).join(", ");
    if (!itensFormatados) {
      return [];
    }

    return [
      new Paragraph({
        children: [
          new TextRun({
            text: "ESCOPO: Impugnação PARCIAL — Itens contestados:",
            bold: true,
            size: 20,
            font: "Arial",
            color: "0078D1",
          }),
        ],
        spacing: { before: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: itensFormatados,
            size: 20,
            font: "Arial",
          }),
        ],
        spacing: { after: 200 },
      }),
    ];
  }

  private resolverNomeEmpresa(input: {
    nomeEmpresaUsuario?: string | null;
    nomeEmpresaBid?: string | null;
    nomeEmpresaDto?: string;
    nomeUsuario?: string | null;
  }): string {
    const candidatos = [
      input.nomeEmpresaUsuario,
      input.nomeEmpresaBid,
      input.nomeEmpresaDto,
      input.nomeUsuario,
    ];

    const valido = candidatos
      .map((nome) => nome?.trim())
      .find((nome) => nome && nome.length > 0 && !this.isNomeSistemaPadrao(nome));

    return valido ?? "Empresa não configurada";
  }

  private isNomeSistemaPadrao(nome: string): boolean {
    return nome.toLowerCase() === "limvex (sistema)";
  }

  private async ensureTemplateFile(tipo: TipoPeticao, document: Document) {
    const templatesDir = path.resolve(process.cwd(), "src/juridico/templates");
    await fs.mkdir(templatesDir, { recursive: true });

    const filePath = path.join(templatesDir, `${tipo}.docx`);
    const templateBuffer = await Packer.toBuffer(document);
    await fs.writeFile(filePath, templateBuffer);
  }
}
