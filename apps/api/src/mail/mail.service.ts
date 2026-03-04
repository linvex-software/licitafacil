import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MailtrapClient } from "mailtrap";

interface BoasVindasParams {
  nomeEmpresa: string;
  emailAdmin: string;
  senhaTemp: string;
  urlSistema: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private client: MailtrapClient;

  constructor(private config: ConfigService) {
    this.client = new MailtrapClient({
      token: this.config.get<string>("MAILTRAP_API_TOKEN") ?? "",
    });
  }

  private getFrom() {
    return {
      // Em desenvolvimento, usa domínio demo do Mailtrap para evitar bloqueio de credibilidade.
      email: this.config.get<string>("NODE_ENV") === "development"
        ? "hello@demomailtrap.co"
        : (this.config.get<string>("MAIL_FROM") ?? "noreply@limvex.com"),
      name: this.config.get<string>("MAIL_FROM_NAME") ?? "Limvex Licitação",
    };
  }

  async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    try {
      await this.client.send({
        from: this.getFrom(),
        to: [{ email: to }],
        subject: "Redefinição de senha — Limvex Licitação",
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
            <h2 style="color: #0078D1; margin-bottom: 8px;">Redefinir sua senha</h2>
            <p style="color: #444; line-height: 1.6;">
              Recebemos uma solicitação para redefinir a senha da sua conta
              na plataforma Limvex Licitação.
            </p>
            <p style="color: #444; line-height: 1.6;">
              Clique no botão abaixo para criar uma nova senha.
              Este link expira em <strong>30 minutos</strong>.
            </p>
            <a href="${resetUrl}"
               style="display: inline-block; margin: 24px 0; padding: 12px 28px;
                      background: #0078D1; color: #fff; text-decoration: none;
                      border-radius: 8px; font-weight: 600; font-size: 14px;">
              Redefinir senha
            </a>
            <p style="color: #888; font-size: 12px; line-height: 1.6;">
              Se você não solicitou a redefinição, ignore este email.
              Sua senha permanece a mesma.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
            <p style="color: #bbb; font-size: 11px;">
              Limvex Licitação · Plataforma de gestão de licitações públicas
            </p>
          </div>
        `,
        category: "Password Reset",
      } as any);
      this.logger.log(`Password reset email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${to}`, error as any);
      throw error;
    }
  }

  async sendWelcome(to: string, name: string): Promise<void> {
    try {
      await this.client.send({
        from: this.getFrom(),
        to: [{ email: to }],
        subject: "Bem-vindo à Limvex Licitação",
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
            <h2 style="color: #0078D1;">Bem-vindo, ${name}!</h2>
            <p style="color: #444; line-height: 1.6;">
              Sua conta na plataforma Limvex Licitação está pronta.
              Acesse agora e comece a gerenciar seus processos licitatórios.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
            <p style="color: #bbb; font-size: 11px;">
              Limvex Licitação · Plataforma de gestão de licitações públicas
            </p>
          </div>
        `,
        category: "Welcome",
      } as any);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${to}`, error as any);
      throw error;
    }
  }

  async enviarBoasVindas(params: BoasVindasParams): Promise<void> {
    const html = this.templateBoasVindas(params);

    try {
      await this.client.send({
        from: this.getFrom(),
        to: [{ email: params.emailAdmin }],
        subject: `Bem-vindo ao Limvex - ${params.nomeEmpresa}`,
        html,
      } as any);
      this.logger.log(`Email de boas-vindas enviado para ${params.emailAdmin}`);
    } catch (error) {
      this.logger.error(`Falha ao enviar email de boas-vindas para ${params.emailAdmin}: ${error}`);
    }
  }

  /**
   * Envia email de notificação de suspensão de contrato
   */
  async enviarEmailSuspensao(
    email: string,
    nomeEmpresa: string,
  ): Promise<void> {
    const html = this.templateSuspensao(nomeEmpresa);

    try {
      await this.client.send({
        from: this.getFrom(),
        to: [{ email }],
        subject: `[Ação Necessária] Contrato Suspenso - ${nomeEmpresa}`,
        html,
      } as any);

      this.logger.log(`Email de suspensão enviado para ${email}`);
    } catch (error) {
      this.logger.error(`Falha ao enviar email de suspensão para ${email}: ${error}`);
    }
  }

  private templateSuspensao(nomeEmpresa: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .warning { background: white; padding: 20px; border-left: 4px solid #e74c3c; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 30px; background: #e74c3c; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 30px; color: #888; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Contrato Suspenso</h1>
            <p>${nomeEmpresa}</p>
          </div>
          <div class="content">
            <p>Prezado(a),</p>
            <p>Informamos que o contrato da empresa <strong>${nomeEmpresa}</strong> foi <strong>suspenso automaticamente</strong> devido ao não pagamento.</p>

            <div class="warning">
              <h3>O que isso significa?</h3>
              <p>Enquanto o contrato estiver suspenso, o acesso ao sistema poderá ser limitado.</p>
              <p>Para reativar, basta regularizar o pagamento pendente.</p>
            </div>

            <p>Em caso de dúvidas ou para regularizar sua situação, entre em contato:</p>
            <p>Email: financeiro@limvex.com.br</p>
          </div>
          <div class="footer">
            <p>&copy; 2024-2026 Limvex Software. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private templateBoasVindas(params: BoasVindasParams): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .credentials { background: white; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 30px; color: #888; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Bem-vindo ao Limvex Licitação!</h1>
            <p>${params.nomeEmpresa}</p>
          </div>
          <div class="content">
            <p>Olá,</p>
            <p>Sua conta no <strong>Limvex Licitação</strong> foi criada com sucesso! Agora você pode gerenciar todas as suas licitações em um só lugar.</p>

            <div class="credentials">
              <h3>Suas Credenciais de Acesso</h3>
              <p><strong>Email:</strong> ${params.emailAdmin}</p>
              <p><strong>Senha Temporária:</strong> <code style="background: #f0f0f0; padding: 5px 10px; border-radius: 3px;">${params.senhaTemp}</code></p>
              <p style="color: #e74c3c; font-size: 14px;">Por segurança, altere sua senha no primeiro acesso.</p>
            </div>

            <a href="${params.urlSistema}/login" class="button">Acessar Sistema</a>

            <h3>Próximos Passos</h3>
            <ol>
              <li>Faça login no sistema</li>
              <li>Altere sua senha</li>
              <li>Configure sua primeira licitação</li>
              <li>Adicione membros da equipe</li>
            </ol>

            <p>Em caso de dúvidas, entre em contato com nosso suporte:</p>
            <p>Email: suporte@limvex.com.br</p>
          </div>
          <div class="footer">
            <p>&copy; 2024-2026 Limvex Software. Todos os direitos reservados.</p>
            <p>Este email foi enviado automaticamente. Por favor, não responda.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
