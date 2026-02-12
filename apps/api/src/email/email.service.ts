import { Injectable, Logger } from "@nestjs/common";
import sgMail from "@sendgrid/mail";
import * as fs from "fs";
import * as path from "path";
import Handlebars from "handlebars";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private templates: Map<string, HandlebarsTemplateDelegate> = new Map();
  private baseTemplate: HandlebarsTemplateDelegate | null = null;

  constructor() {
    const apiKey = process.env.SENDGRID_API_KEY;

    if (apiKey && apiKey !== "AGUARDANDO_CONFIGURACAO") {
      sgMail.setApiKey(apiKey);
      this.logger.log("SendGrid inicializado com sucesso");
    } else {
      this.logger.warn(
        "SendGrid não configurado - emails serão apenas logados (modo simulado)",
      );
    }

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
  }): Promise<boolean> {
    const apiKey = process.env.SENDGRID_API_KEY;

    if (!apiKey || apiKey === "AGUARDANDO_CONFIGURACAO") {
      this.logger.warn(
        `[SIMULADO] Email para ${params.to}: ${params.subject}`,
      );
      return true;
    }

    try {
      await sgMail.send({
        to: params.to,
        from: {
          email: process.env.EMAIL_FROM || "noreply@limvex.com.br",
          name: process.env.EMAIL_FROM_NAME || "Limvex Licitação",
        },
        subject: params.subject,
        html: params.html,
      });

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
}
