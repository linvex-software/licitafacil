import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Logger,
  BadRequestException,
  NotFoundException,
  UseGuards,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "./email.service";
import { EmailCronService } from "./email.cron.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

/**
 * Controller público para ações de email (sem autenticação)
 * Não usa JwtAuthGuard / RolesGuard
 */
@Controller("email")
export class EmailController {
  private readonly logger = new Logger(EmailController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly emailCronService: EmailCronService,
  ) {}

  /**
   * Cancela inscrição de emails via token (link no rodapé do email)
   * GET /email/unsubscribe?token=xxx
   */
  @Get("unsubscribe")
  async unsubscribe(@Query("token") token: string) {
    if (!token) {
      throw new BadRequestException("Token inválido");
    }

    const usuario = await this.prisma.user.findUnique({
      where: { unsubscribeToken: token },
    });

    if (!usuario) {
      throw new NotFoundException("Token de cancelamento não encontrado");
    }

    await this.prisma.user.update({
      where: { id: usuario.id },
      data: { receberEmails: false },
    });

    return { message: "Cancelamento de emails confirmado com sucesso." };
  }

  /**
   * ⚠️ ENDPOINT APENAS PARA DESENVOLVIMENTO - REMOVER EM PRODUÇÃO
   * Endpoint temporário para testar envio de emails
   * POST /email/test
   * Body: { email: string, tipo: 'bem-vindo' | 'documento' | 'prazo' | 'risco' }
   */
  @Post("test")
  @UseGuards(JwtAuthGuard)
  async testarEmail(@Body() body: { email: string; tipo: string }) {
    const { email, tipo } = body;

    if (!email || !tipo) {
      throw new BadRequestException(
        'Parâmetros obrigatórios: email, tipo (bem-vindo | documento | prazo | risco)',
      );
    }

    const dadosTeste = {
      email,
      nomeUsuario: "Carlos Admin",
      nomeEmpresa: "Construtora ABC",
      unsubscribeToken: "token-teste-123",
    };

    let sucesso = false;

    switch (tipo) {
      case "bem-vindo":
        sucesso = await this.emailService.sendWelcome({
          ...dadosTeste,
          senhaTemporaria: "Senha@123",
        });
        break;

      case "documento":
        sucesso = await this.emailService.sendDocumentoVencendo({
          ...dadosTeste,
          nomeDocumento: "Certidão Negativa de Débitos Federais",
          nomeLicitacao: "PE 001/2026 - Aquisição de Equipamentos",
          licitacaoId: "teste-id-123",
          dataVencimento: "20/02/2026",
          diasRestantes: 7,
        });
        break;

      case "prazo":
        sucesso = await this.emailService.sendPrazoCritico({
          ...dadosTeste,
          nomeLicitacao: "PE 001/2026 - Aquisição de Equipamentos",
          orgao: "Prefeitura Municipal de São Paulo",
          licitacaoId: "teste-id-123",
          tipoPrazo: "Abertura de Propostas",
          dataPrazo: "15/02/2026",
          diasRestantes: 3,
        });
        break;

      case "risco":
        sucesso = await this.emailService.sendLicitacaoRisco({
          ...dadosTeste,
          nomeLicitacao: "PE 001/2026 - Aquisição de Equipamentos",
          orgao: "Prefeitura Municipal de São Paulo",
          licitacaoId: "teste-id-123",
          motivos: [
            "Documento CND vence em 3 dias",
            "Proposta técnica não enviada",
            "Prazo de recurso se esgotando",
          ],
        });
        break;

      default:
        return {
          error: "Tipo inválido. Use: bem-vindo, documento, prazo, risco",
        };
    }

    return {
      success: sucesso,
      message: sucesso
        ? `Email tipo "${tipo}" enviado para ${email}`
        : `Falha ao enviar email tipo "${tipo}" para ${email}`,
    };
  }

  /**
   * ⚠️ ENDPOINT APENAS PARA DESENVOLVIMENTO - REMOVER EM PRODUÇÃO
   * Endpoint temporário para disparar o cron manualmente
   * POST /email/test-cron
   */
  @Post("test-cron")
  @UseGuards(JwtAuthGuard)
  async testarCron() {
    this.logger.log("Disparando cron de alertas manualmente para teste...");
    await this.emailCronService.verificarAlertas();
    return {
      success: true,
      message: "Cron executado. Verifique os logs do backend.",
    };
  }
}
