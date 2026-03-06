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
    email: "hello@mail.lvxlicitacao.com.br",
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
}
