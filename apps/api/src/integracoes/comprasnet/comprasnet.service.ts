import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  ComprasnetScraperService,
  type FiltrosBusca,
  type ResultadoBusca,
} from "./comprasnet-scraper.service";
import { EmailService } from "../../email/email.service";

@Injectable()
export class ComprasnetService {
  private readonly logger = new Logger(ComprasnetService.name);

  constructor(
    private prisma: PrismaService,
    private scraperService: ComprasnetScraperService,
    private emailService: EmailService,
  ) {}

  async buscar(empresaId: string, filtros: FiltrosBusca) {
    this.logger.log(`Busca ComprasNet para empresa ${empresaId}`);
    const resultados = await this.scraperService.buscarLicitacoes(filtros);
    return { total: resultados.length, resultados };
  }

  async importar(
    empresaId: string,
    licitacoes: ResultadoBusca[],
  ): Promise<{ importadas: number; duplicadas: number }> {
    let importadas = 0;
    let duplicadas = 0;

    for (const lic of licitacoes) {
      // Verificar duplicata por número + órgão no título
      const existe = await this.prisma.bid.findFirst({
        where: {
          empresaId,
          title: { contains: lic.numero },
          deletedAt: null,
        },
      });

      if (existe) {
        duplicadas++;
        continue;
      }

      // Criar licitação usando os campos reais do modelo Bid
      const bid = await this.prisma.bid.create({
        data: {
          empresaId,
          title: `${lic.orgao} - ${lic.numero}/${new Date().getFullYear()}`,
          agency: lic.orgao || lic.uasg,
          modality: lic.modalidade || "PREGAO_ELETRONICO",
          legalStatus: "ANALISANDO",
          operationalState: "IMPORTADA",
        },
      });

      // Criar prazo se tiver dataLimite
      if (lic.dataLimite) {
        try {
          const dataFormatada = this.parsarData(lic.dataLimite);
          if (dataFormatada) {
            await this.prisma.prazo
              .create({
                data: {
                  empresaId,
                  bidId: bid.id,
                  titulo: "Entrega de proposta - importado do PNCP",
                  dataPrazo: dataFormatada,
                  descricao: `Fonte: PNCP (Portal Nacional de Contratações Públicas). Link: ${lic.linkEdital || "N/A"}`,
                },
              })
              .catch(() => null); // Não quebrar se houver erro
          }
        } catch {
          // Ignorar erro de parsing de data
        }
      }

      importadas++;
    }

    this.logger.log(
      `Importação concluída: ${importadas} importadas, ${duplicadas} duplicadas`,
    );
    return { importadas, duplicadas };
  }

  private parsarData(dataStr: string): Date | null {
    try {
      // Tentar formato dd/mm/yyyy HH:mm (retornado pelo PNCP)
      const matchHora = dataStr.match(
        /(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/,
      );
      if (matchHora) {
        return new Date(
          `${matchHora[3]}-${matchHora[2]}-${matchHora[1]}T${matchHora[4]}:${matchHora[5]}:00`,
        );
      }
      // Tentar formato dd/mm/yyyy
      const match = dataStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (match) {
        return new Date(`${match[3]}-${match[2]}-${match[1]}`);
      }
      // Tentar formato ISO
      const date = new Date(dataStr);
      if (!isNaN(date.getTime())) {
        return date;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Verifica se uma licitação já foi importada (duplicata).
   */
  async verificarDuplicata(
    empresaId: string,
    lic: ResultadoBusca,
  ): Promise<boolean> {
    const existe = await this.prisma.bid.findFirst({
      where: {
        empresaId,
        title: { contains: lic.numero },
        deletedAt: null,
      },
    });
    return !!existe;
  }

  async salvarBusca(
    empresaId: string,
    nome: string,
    filtros: FiltrosBusca,
    autoImportar: boolean,
  ) {
    return this.prisma.buscaSalva.create({
      data: {
        empresaId,
        nome,
        filtros: filtros as any,
        autoImportar,
        ativa: true,
      },
    });
  }

  async listarBuscas(empresaId: string) {
    return this.prisma.buscaSalva.findMany({
      where: { empresaId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
  }

  async deletarBusca(id: string, _empresaId: string) {
    return this.prisma.buscaSalva.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async executarBuscasAutomaticas(): Promise<void> {
    this.logger.log("Executando buscas automáticas do ComprasNet...");

    const buscas = await this.prisma.buscaSalva.findMany({
      where: { ativa: true, autoImportar: true, deletedAt: null },
      include: {
        empresa: {
          include: {
            users: { where: { receberEmails: true, deletedAt: null } },
          },
        },
      },
    });

    this.logger.log(`${buscas.length} buscas automáticas ativas`);

    for (const busca of buscas) {
      try {
        this.logger.log(`Executando busca: ${busca.nome}`);

        const filtros = busca.filtros as unknown as FiltrosBusca;
        const { resultados } = await this.buscar(busca.empresaId, filtros);

        const { importadas, duplicadas } = await this.importar(
          busca.empresaId,
          resultados,
        );

        // Atualizar última execução
        await this.prisma.buscaSalva.update({
          where: { id: busca.id },
          data: {
            ultimaExecucao: new Date(),
            totalImportadas: { increment: importadas },
          },
        });

        // Enviar email se importou algo novo
        if (importadas > 0) {
          for (const usuario of busca.empresa.users) {
            await this.emailService.sendEmail({
              to: usuario.email,
              subject: `${importadas} novas licitações - "${busca.nome}"`,
              html: `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
                  <div style="background:#1a1a2e;color:white;padding:24px;border-radius:8px 8px 0 0">
                    <h1 style="margin:0;font-size:20px">Limvex Licitação</h1>
                    <p style="margin:8px 0 0;opacity:0.8">Novas licitações encontradas</p>
                  </div>
                  <div style="padding:24px;background:#f8fafc;border:1px solid #e2e8f0">
                    <p>Olá, <strong>${usuario.name}</strong>!</p>
                    <p>A busca automática <strong>"${busca.nome}"</strong> encontrou novas licitações:</p>
                    <div style="background:white;padding:16px;border-radius:8px;margin:16px 0;border-left:4px solid #16a34a">
                      <p style="margin:0;font-size:24px;font-weight:bold;color:#16a34a">${importadas} novas licitações</p>
                      <p style="margin:4px 0 0;color:#64748b">${duplicadas} já existiam na plataforma</p>
                    </div>
                    <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}/licitacoes?source=COMPRASNET"
                       style="display:inline-block;background:#16a34a;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">
                      Ver Licitações Importadas
                    </a>
                  </div>
                </div>
              `,
            });
          }
        }

        this.logger.log(
          `Busca "${busca.nome}": ${importadas} importadas, ${duplicadas} duplicadas`,
        );
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.error(`Erro na busca "${busca.nome}": ${msg}`);
        // Continuar para próxima busca - não quebrar o cron
      }
    }
  }
}
