import { Injectable, Logger } from "@nestjs/common";
import * as nodemailer from "nodemailer";

interface BoasVindasParams {
  nomeEmpresa: string;
  emailAdmin: string;
  senhaTemp: string;
  urlSistema: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async enviarBoasVindas(params: BoasVindasParams): Promise<void> {
    const html = this.templateBoasVindas(params);

    try {
      await this.transporter.sendMail({
        from: `"Limvex Licitação" <${process.env.SMTP_USER || "noreply@limvex.com.br"}>`,
        to: params.emailAdmin,
        subject: `Bem-vindo ao Limvex - ${params.nomeEmpresa}`,
        html,
      });

      this.logger.log(`Email de boas-vindas enviado para ${params.emailAdmin}`);
    } catch (error) {
      this.logger.error(
        `Falha ao enviar email de boas-vindas para ${params.emailAdmin}: ${error}`,
      );
      // Não lançar exceção para não bloquear criação do cliente
      // O email pode ser reenviado manualmente depois
    }
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
