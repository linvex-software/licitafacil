import { Injectable, Logger } from "@nestjs/common";
import { MailtrapClient } from "mailtrap";
import * as fs from "fs";
import * as path from "path";
import Handlebars from "handlebars";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private templates: Map<string, HandlebarsTemplateDelegate> = new Map();
  private baseTemplate: HandlebarsTemplateDelegate | null = null;
  private readonly client: MailtrapClient;
  private readonly sender = {
    email: "hello@mail.licitacao.limvex.com",
    name: "LicitaFácil",
  };

  constructor() {
    const token = process.env.MAILTRAP_API_TOKEN;
    if (token) {
      this.logger.log("Mailtrap inicializado com sucesso");
    } else {
      this.logger.warn(
        "MAILTRAP_API_TOKEN não configurado - emails serão apenas logados (modo simulado)",
      );
    }

    this.client = new MailtrapClient({ token: token ?? "" });
    this.carregarTemplates();
  }

  private carregarTemplates(): void {
    const templatesDir = path.join(__dirname, "templates");

    // Carregar template base
    const basePath = path.join(templatesDir, "base.html");
    if (fs.existsSync(basePath)) {
      const baseHtml = fs.readFileSync(basePath, "utf-8");
      this.baseTemplate = Handlebars.compile(baseHtml);
      this.logger.log("Template base carregado");
    } else {
      this.logger.warn(`Template base não encontrado em: ${basePath}`);
    }

    // Carregar templates individuais
    const templateNames = [
      "bem-vindo",
      "documento-vencendo",
      "prazo-critico",
      "licitacao-risco",
    ];

    for (const name of templateNames) {
      const filePath = path.join(templatesDir, `${name}.html`);
      if (fs.existsSync(filePath)) {
        const html = fs.readFileSync(filePath, "utf-8");
        this.templates.set(name, Handlebars.compile(html));
        this.logger.log(`Template carregado: ${name}`);
      } else {
        this.logger.warn(`Template não encontrado: ${filePath}`);
      }
    }
  }

  private renderTemplate(
    templateName: string,
    dados: Record<string, unknown>,
  ): string {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template não encontrado: ${templateName}`);
    }

    const conteudo = template(dados);

    if (this.baseTemplate) {
      return this.baseTemplate({
        ...dados,
        conteudo,
        frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
      });
    }

    return conteudo;
  }

  async sendEmail(params: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    attachments?: Array<{
      content: string;
      filename: string;
      type: string;
      disposition: string;
    }>;
  }): Promise<boolean> {
    const token = process.env.MAILTRAP_API_TOKEN;

    if (!token) {
      this.logger.warn(
        `[SIMULADO] Email para ${params.to}: ${params.subject}${params.attachments ? ` (com ${params.attachments.length} anexo(s))` : ""}`,
      );
      return true;
    }

    try {
      await this.client.send({
        from: this.sender,
        to: [{ email: params.to }],
        subject: params.subject,
        html: params.html,
        text: params.text ?? "Este email possui conteúdo em HTML. Abra em um cliente compatível para visualizar.",
        category: "Transactional",
        attachments: params.attachments,
      } as any);

      this.logger.log(`Email enviado para ${params.to}: ${params.subject}`);
      return true;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Erro ao enviar email para ${params.to}: ${msg}`);
      return false;
    }
  }

  async sendWelcome(params: {
    email: string;
    nomeUsuario: string;
    nomeEmpresa: string;
    senhaTemporaria: string;
    unsubscribeToken: string;
  }): Promise<boolean> {
    try {
      const html = this.renderTemplate("bem-vindo", {
        ...params,
        frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
      });
      return this.sendEmail({
        to: params.email,
        subject: `Bem-vindo à Limvex, ${params.nomeUsuario}!`,
        html,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Erro ao enviar email de boas-vindas: ${msg}`);
      return false;
    }
  }

  async sendDocumentoVencendo(params: {
    email: string;
    nomeUsuario: string;
    nomeEmpresa: string;
    nomeDocumento: string;
    nomeLicitacao: string;
    licitacaoId: string;
    dataVencimento: string;
    diasRestantes: number;
    unsubscribeToken: string;
  }): Promise<boolean> {
    try {
      const html = this.renderTemplate("documento-vencendo", {
        ...params,
        frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
      });
      return this.sendEmail({
        to: params.email,
        subject: `Documento vencendo em ${params.diasRestantes} dias - ${params.nomeDocumento}`,
        html,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Erro ao enviar alerta de documento: ${msg}`);
      return false;
    }
  }

  async sendPrazoCritico(params: {
    email: string;
    nomeUsuario: string;
    nomeEmpresa: string;
    nomeLicitacao: string;
    orgao: string;
    licitacaoId: string;
    tipoPrazo: string;
    dataPrazo: string;
    diasRestantes: number;
    unsubscribeToken: string;
  }): Promise<boolean> {
    try {
      const html = this.renderTemplate("prazo-critico", {
        ...params,
        frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
      });
      return this.sendEmail({
        to: params.email,
        subject: `Prazo crítico em ${params.diasRestantes} dias - ${params.nomeLicitacao}`,
        html,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Erro ao enviar alerta de prazo: ${msg}`);
      return false;
    }
  }

  async sendLicitacaoRisco(params: {
    email: string;
    nomeUsuario: string;
    nomeEmpresa: string;
    nomeLicitacao: string;
    orgao: string;
    licitacaoId: string;
    motivos: string[];
    unsubscribeToken: string;
  }): Promise<boolean> {
    try {
      const html = this.renderTemplate("licitacao-risco", {
        ...params,
        frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
      });
      return this.sendEmail({
        to: params.email,
        subject: `Licitação em risco - ${params.nomeLicitacao}`,
        html,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Erro ao enviar alerta de risco: ${msg}`);
      return false;
    }
  }

  async enviarAlertaPregao(dados: {
    to: string;
    numeroPregao: string;
    objeto: string;
    portal: string;
    horarioInicio: Date;
    urlSalaDisputa: string;
  }): Promise<boolean> {
    const horario = new Date(dados.horarioInicio).toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#2563EB;padding:24px;border-radius:8px 8px 0 0">
          <h1 style="color:white;margin:0;font-size:20px">Pregão iniciando em breve</h1>
        </div>
        <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-top:none">
          <p style="color:#374151;font-size:15px;margin:0 0 16px">
            O pregão abaixo está prestes a iniciar. Acesse o portal para participar.
          </p>
          <table style="width:100%;border-collapse:collapse">
            <tr>
              <td style="padding:8px;background:#fff;border:1px solid #e2e8f0;font-weight:bold;width:35%">Número</td>
              <td style="padding:8px;background:#fff;border:1px solid #e2e8f0">${dados.numeroPregao}</td>
            </tr>
            <tr>
              <td style="padding:8px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:bold">Portal</td>
              <td style="padding:8px;background:#f8fafc;border:1px solid #e2e8f0">${dados.portal}</td>
            </tr>
            <tr>
              <td style="padding:8px;background:#fff;border:1px solid #e2e8f0;font-weight:bold">Horário</td>
              <td style="padding:8px;background:#fff;border:1px solid #e2e8f0">${horario}</td>
            </tr>
            <tr>
              <td style="padding:8px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:bold">Objeto</td>
              <td style="padding:8px;background:#f8fafc;border:1px solid #e2e8f0">${(dados.objeto ?? "").slice(0, 200)}</td>
            </tr>
          </table>
          <div style="text-align:center;margin-top:24px">
            <a href="${dados.urlSalaDisputa}"
              style="background:#2563EB;color:white;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:15px">
              Abrir sala de disputa
            </a>
          </div>
        </div>
        <div style="padding:16px;text-align:center">
          <p style="color:#9ca3af;font-size:12px;margin:0">
            Limvex Licitação — Gestão inteligente de processos licitatórios
          </p>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: dados.to,
      subject: `Pregão ${dados.numeroPregao} inicia em breve — ${dados.portal}`,
      html,
    });
  }
}
