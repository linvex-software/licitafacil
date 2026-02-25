import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaTenantService } from "../prisma/prisma-tenant.service";
import { PrismaService } from "../prisma/prisma.service";
import { StatusPeticao, TipoPeticao } from "@prisma/client";
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import * as fs from "fs/promises";
import * as path from "path";

type DadosPeticao = {
  conteudo: string;
  cnpj?: string;
  endereco?: string;
  cidade?: string;
};

@Injectable()
export class JuridicoService {
  private readonly logger = new Logger(JuridicoService.name);

  constructor(
    private readonly prismaTenant: PrismaTenantService,
    private readonly prisma: PrismaService,
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
    });

    if (!bid) {
      this.logger.warn(`Licitação não encontrada no tenant. bidId=${bidId} empresaId=${empresaId}`);
      throw new NotFoundException("Licitação não encontrada");
    }

    const empresa = await this.prisma.empresa.findFirst({
      where: { id: empresaId, deletedAt: null },
      select: { id: true, name: true },
    });

    if (!empresa) {
      throw new NotFoundException("Empresa não encontrada");
    }

    const conteudo = (dados.conteudo || "").trim();
    if (!conteudo) {
      throw new BadRequestException("Conteúdo da petição é obrigatório");
    }

    const now = new Date();
    const nomeArquivo = this.buildFileName(tipo, bid.title, now);
    const document = this.buildDocument({
      tipo,
      conteudo,
      empresaNome: empresa.name,
      numeroLicitacao: bid.title,
      orgao: bid.agency,
      cidade: dados.cidade || "Cidade/UF",
      cnpj: dados.cnpj || "Não informado",
      endereco: dados.endereco || "Não informado",
      data: now,
    });

    const buffer = await Packer.toBuffer(document);
    await this.ensureTemplateFile(tipo, document);

    const peticao = await prismaWithTenant.peticao.create({
      data: {
        empresaId,
        bidId,
        tipo,
        conteudo,
        nomeArquivo,
        status: StatusPeticao.RASCUNHO,
      },
    });

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
  }) {
    const titulo = this.getTitulo(input.tipo);
    const secoes = this.getSecoes(input.tipo);
    const dataFormatada = this.formatDatePtBr(input.data);

    return new Document({
      styles: {
        default: {
          document: {
            run: {
              font: "Times New Roman",
              size: 24,
            },
            paragraph: {
              spacing: {
                line: 360,
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
            new Paragraph({
              children: [new TextRun({ text: `${input.cidade}, ${dataFormatada}` })],
            }),
            new Paragraph({
              children: [new TextRun({ text: `À ${input.orgao}`, bold: true })],
            }),
            new Paragraph({
              spacing: { before: 240, after: 240 },
              alignment: AlignmentType.CENTER,
              border: {
                bottom: {
                  style: BorderStyle.SINGLE,
                  color: "auto",
                  size: 6,
                  space: 1,
                },
              },
              children: [new TextRun({ text: titulo, bold: true })],
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
            ...this.getConteudoParagraphs(input.conteudo),
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 240, after: 120 },
              children: [new TextRun({ text: secoes.pedidoTitulo, bold: true })],
            }),
            new Paragraph({
              children: [new TextRun({ text: secoes.pedidoTexto })],
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
              children: [new TextRun({ text: `${input.cidade}, ${dataFormatada}` })],
            }),
            new Paragraph({
              spacing: { before: 240 },
              children: [new TextRun({ text: input.empresaNome, bold: true })],
            }),
            new Paragraph({
              children: [new TextRun({ text: "Assinatura" })],
            }),
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

  private formatDatePtBr(date: Date) {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  }

  private async ensureTemplateFile(tipo: TipoPeticao, document: Document) {
    const templatesDir = path.resolve(process.cwd(), "src/juridico/templates");
    await fs.mkdir(templatesDir, { recursive: true });

    const filePath = path.join(templatesDir, `${tipo}.docx`);
    try {
      await fs.access(filePath);
    } catch {
      const templateBuffer = await Packer.toBuffer(document);
      await fs.writeFile(filePath, templateBuffer);
    }
  }
}
