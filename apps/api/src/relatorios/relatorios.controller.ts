import {
  Controller,
  Post,
  Body,
  Request,
  Res,
  UseGuards,
  Logger,
} from "@nestjs/common";
import { Response } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { UserRole } from "@licitafacil/shared";
import { RelatoriosService } from "./relatorios.service";
import { PdfService } from "./pdf.service";
import { EmailService } from "../email/email.service";
import { FiltroRelatorioDto } from "./dto/filtro-relatorio.dto";
import { PrismaService } from "../prisma/prisma.service";

@Controller("relatorios")
@UseGuards(JwtAuthGuard, RolesGuard)
export class RelatoriosController {
  private readonly logger = new Logger(RelatoriosController.name);

  constructor(
    private relatoriosService: RelatoriosService,
    private pdfService: PdfService,
    private emailService: EmailService,
    private prisma: PrismaService,
  ) {}

  @Post("dados")
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.COLABORADOR)
  async obterDados(@Request() req: any, @Body() filtro: FiltroRelatorioDto) {
    return this.relatoriosService.gerarDados(req.user.empresaId, filtro);
  }

  @Post("gerar-pdf")
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.COLABORADOR)
  async gerarPdf(
    @Request() req: any,
    @Body() filtro: FiltroRelatorioDto,
    @Res() res: Response,
  ) {
    const inicio = Date.now();
    this.logger.log("Gerando PDF...");

    const empresa = await this.prisma.empresa.findUnique({
      where: { id: req.user.empresaId },
    });

    const dados = await this.relatoriosService.gerarDados(
      req.user.empresaId,
      filtro,
    );
    const nomeEmpresa = empresa?.name || "Empresa";
    const pdf = await this.pdfService.gerarPdf(dados, nomeEmpresa);

    const tempo = ((Date.now() - inicio) / 1000).toFixed(1);
    this.logger.log(`PDF gerado em ${tempo}s`);

    const dataHoje = new Date().toISOString().split("T")[0];
    const filename = `relatorio-licitacoes-${dataHoje}.pdf`;

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": pdf.length.toString(),
    });

    res.end(pdf);
  }

  @Post("enviar-email")
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async enviarEmail(
    @Request() req: any,
    @Body()
    body: {
      filtro: FiltroRelatorioDto;
      emailDestino: string;
      mensagem?: string;
    },
  ) {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: req.user.empresaId },
    });

    const dados = await this.relatoriosService.gerarDados(
      req.user.empresaId,
      body.filtro,
    );
    const nomeEmpresa = empresa?.name || "Empresa";
    const pdf = await this.pdfService.gerarPdf(dados, nomeEmpresa);

    const dataHoje = new Date().toISOString().split("T")[0];
    const filename = `relatorio-licitacoes-${dataHoje}.pdf`;

    await this.emailService.sendEmail({
      to: body.emailDestino,
      subject: `Relatório Gerencial - ${dados.periodo.label} - ${nomeEmpresa}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#1a1a2e;color:white;padding:24px;border-radius:8px 8px 0 0">
            <h1 style="margin:0;font-size:20px">LicitaFácil</h1>
            <p style="margin:8px 0 0;opacity:0.8">Relatório Gerencial de Licitações</p>
          </div>
          <div style="padding:24px;background:#f8fafc;border:1px solid #e2e8f0">
            <p>Olá!</p>
            <p>Segue em anexo o relatório gerencial de licitações referente ao período: <strong>${dados.periodo.label}</strong></p>
            ${body.mensagem ? `<p style="background:white;padding:12px;border-radius:4px;border-left:4px solid #2563eb">${body.mensagem}</p>` : ""}
            <p><strong>Resumo:</strong></p>
            <ul>
              <li>Total de licitações: ${dados.metricas.total}</li>
              <li>Licitações vencidas: ${dados.metricas.ganhas}</li>
              <li>Taxa de sucesso: ${dados.metricas.taxaSucesso}%</li>
            </ul>
            <p style="color:#64748b;font-size:12px;margin-top:24px">Gerado pela plataforma LicitaFácil</p>
          </div>
        </div>
      `,
      attachments: [
        {
          content: pdf.toString("base64"),
          filename,
          type: "application/pdf",
          disposition: "attachment",
        },
      ],
    });

    return {
      success: true,
      message: `Relatório enviado para ${body.emailDestino}`,
    };
  }
}
