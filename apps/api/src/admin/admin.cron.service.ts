import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail/mail.service";

@Injectable()
export class AdminCronService {
  private readonly logger = new Logger(AdminCronService.name);

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  /**
   * Verifica contratos vencidos há mais de 15 dias e suspende automaticamente.
   * Executa diariamente à meia-noite.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async verificarContratosVencidos() {
    this.logger.log("Iniciando verificação de contratos vencidos...");

    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - 15); // Vencido há 15+ dias

    const contratosVencidos = await this.prisma.contrato.findMany({
      where: {
        status: "ATIVO",
        proximoVencimento: { lt: dataLimite },
      },
      include: {
        empresa: {
          include: {
            clienteConfig: true,
          },
        },
      },
    });

    for (const contrato of contratosVencidos) {
      await this.prisma.contrato.update({
        where: { id: contrato.id },
        data: { status: "SUSPENSO" },
      });

      // Enviar email de suspensão
      const emailContato = contrato.empresa.clienteConfig?.email;
      if (emailContato) {
        await this.mailService.enviarEmailSuspensao(
          emailContato,
          contrato.empresa.name,
        );
      }

      this.logger.warn(
        `Contrato ${contrato.id} suspenso (vencido desde ${contrato.proximoVencimento.toISOString()})`,
      );
    }

    this.logger.log(`${contratosVencidos.length} contratos suspensos.`);
  }
}
