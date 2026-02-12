import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "./email.service";

@Injectable()
export class EmailCronService {
  private readonly logger = new Logger(EmailCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  // Roda todo dia às 6h da manhã
  @Cron("0 6 * * *")
  async verificarAlertas(): Promise<void> {
    this.logger.log("Iniciando verificação diária de alertas por email...");

    const [docsEnviados, prazosEnviados, riscosEnviados] = await Promise.all([
      this.verificarDocumentosVencendo(),
      this.verificarPrazosCriticos(),
      this.verificarLicitacoesRisco(),
    ]);

    this.logger.log(
      `Alertas enviados: ${docsEnviados} docs, ${prazosEnviados} prazos, ${riscosEnviados} riscos`,
    );
  }

  private async verificarDocumentosVencendo(): Promise<number> {
    const hoje = new Date();
    const em7dias = new Date();
    em7dias.setDate(hoje.getDate() + 7);

    try {
      // Buscar documentos vencendo em até 7 dias que ainda não tiveram alerta enviado
      const documentos = await this.prisma.document.findMany({
        where: {
          doesExpire: true,
          expiresAt: {
            gte: hoje,
            lte: em7dias,
          },
          alertaVencimentoEnviado: false,
          deletedAt: null,
        },
        include: {
          bid: true,
          empresa: {
            include: {
              users: {
                where: {
                  receberEmails: true,
                  receberDocVencendo: true,
                  deletedAt: null,
                },
              },
            },
          },
        },
      });

      let enviados = 0;

      for (const doc of documentos) {
        if (!doc.expiresAt) continue;

        const diasRestantes = Math.ceil(
          (doc.expiresAt.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24),
        );

        for (const usuario of doc.empresa.users) {
          const enviado = await this.emailService.sendDocumentoVencendo({
            email: usuario.email,
            nomeUsuario: usuario.name,
            nomeEmpresa: doc.empresa.name,
            nomeDocumento: doc.name || "Documento",
            nomeLicitacao: doc.bid?.title || "Sem licitação vinculada",
            licitacaoId: doc.bid?.id || "",
            dataVencimento: doc.expiresAt.toLocaleDateString("pt-BR"),
            diasRestantes,
            unsubscribeToken: usuario.unsubscribeToken || "",
          });

          if (enviado) enviados++;
        }

        // Marcar como enviado
        await this.prisma.document.update({
          where: { id: doc.id },
          data: {
            alertaVencimentoEnviado: true,
            alertaVencimentoEnviadoEm: new Date(),
          },
        });
      }

      return enviados;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Erro ao verificar documentos vencendo: ${msg}`);
      return 0;
    }
  }

  private async verificarPrazosCriticos(): Promise<number> {
    const hoje = new Date();
    const em3dias = new Date();
    em3dias.setDate(hoje.getDate() + 3);

    try {
      // Buscar prazos de licitações que vencem em até 3 dias
      const prazos = await this.prisma.prazo.findMany({
        where: {
          dataPrazo: {
            gte: hoje,
            lte: em3dias,
          },
          deletedAt: null,
        },
        include: {
          bid: {
            include: {
              empresa: {
                include: {
                  users: {
                    where: {
                      receberEmails: true,
                      receberPrazoCritico: true,
                      deletedAt: null,
                    },
                  },
                },
              },
            },
          },
        },
      });

      let enviados = 0;

      for (const prazo of prazos) {
        // Verificar se a licitação já teve alerta de prazo enviado
        if (prazo.bid.alertaPrazoEnviado) continue;

        const diasRestantes = Math.ceil(
          (prazo.dataPrazo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24),
        );

        for (const usuario of prazo.bid.empresa.users) {
          const enviado = await this.emailService.sendPrazoCritico({
            email: usuario.email,
            nomeUsuario: usuario.name,
            nomeEmpresa: prazo.bid.empresa.name,
            nomeLicitacao: prazo.bid.title,
            orgao: prazo.bid.agency,
            licitacaoId: prazo.bid.id,
            tipoPrazo: prazo.titulo,
            dataPrazo: prazo.dataPrazo.toLocaleDateString("pt-BR"),
            diasRestantes,
            unsubscribeToken: usuario.unsubscribeToken || "",
          });

          if (enviado) enviados++;
        }

        // Marcar licitação como alertada
        await this.prisma.bid.update({
          where: { id: prazo.bid.id },
          data: {
            alertaPrazoEnviado: true,
            alertaPrazoEnviadoEm: new Date(),
          },
        });
      }

      return enviados;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Erro ao verificar prazos críticos: ${msg}`);
      return 0;
    }
  }

  private async verificarLicitacoesRisco(): Promise<number> {
    try {
      // Buscar licitações em estado EM_RISCO que não tiveram alerta enviado
      const licitacoes = await this.prisma.bid.findMany({
        where: {
          operationalState: "EM_RISCO",
          alertaRiscoEnviado: false,
          deletedAt: null,
        },
        include: {
          empresa: {
            include: {
              users: {
                where: {
                  receberEmails: true,
                  receberRisco: true,
                  deletedAt: null,
                },
              },
            },
          },
        },
      });

      let enviados = 0;

      for (const licitacao of licitacoes) {
        const motivos: string[] = [];
        if (licitacao.riskReason) {
          motivos.push(licitacao.riskReason);
        } else {
          motivos.push("Estado operacional marcado como EM RISCO");
        }

        for (const usuario of licitacao.empresa.users) {
          const enviado = await this.emailService.sendLicitacaoRisco({
            email: usuario.email,
            nomeUsuario: usuario.name,
            nomeEmpresa: licitacao.empresa.name,
            nomeLicitacao: licitacao.title,
            orgao: licitacao.agency,
            licitacaoId: licitacao.id,
            motivos,
            unsubscribeToken: usuario.unsubscribeToken || "",
          });

          if (enviado) enviados++;
        }

        await this.prisma.bid.update({
          where: { id: licitacao.id },
          data: {
            alertaRiscoEnviado: true,
            alertaRiscoEnviadoEm: new Date(),
          },
        });
      }

      return enviados;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Erro ao verificar licitações em risco: ${msg}`);
      return 0;
    }
  }
}
