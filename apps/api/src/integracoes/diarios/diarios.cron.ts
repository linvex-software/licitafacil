import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DiariosService } from './diarios.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DiariosCronService {
    private readonly logger = new Logger(DiariosCronService.name);

    constructor(
        private readonly diariosService: DiariosService,
        private readonly prisma: PrismaService,
    ) { }

    /**
     * Executa todos os dias às 08:00 AM (1 hora após o PNCP)
     * Faz a varredura automática baseada nas buscas salvas (ou perfis de empresas ativas)
     */
    @Cron('0 8 * * *')
    async relatorioDiarioLicitacoes() {
        this.logger.log('Iniciando rotina CRON de raspagem de Diários Oficiais...');

        try {
            // 1. Encontra todas as buscas salvas para Diários Oficiais que estão ativas com auto_importar true
            // Nota: assumindo que tipo_busca ou filtros indicam Diários Oficiais
            const buscasAtivas = await this.prisma.buscaSalva.findMany({
                where: { ativa: true, autoImportar: true },
                include: { empresa: true }
            });

            this.logger.log(`Encontradas ${buscasAtivas.length} buscas ativas para processamento.`);

            for (const busca of buscasAtivas) {
                // Extrai filtros (UF, etc) do JSON
                const filtrosConsulta = busca.filtros as any;

                if (!filtrosConsulta.uf) {
                    this.logger.warn(`Busca salva ${busca.id} ignorada: UF não definida nos filtros.`);
                    continue;
                }

                const dataAtual = new Date();
                const ontem = new Date();
                ontem.setDate(ontem.getDate() - 1);

                // Dispara o scraper para a UF
                const novasLicitacoes = await this.diariosService.buscarLicitacoesDiarios(
                    busca.empresaId,
                    {
                        uf: filtrosConsulta.uf,
                        keywords: filtrosConsulta.keywords || [],
                        dataInicio: ontem.toISOString(),
                        dataFim: dataAtual.toISOString(),
                    }
                );

                if (novasLicitacoes.length > 0) {
                    this.logger.log(`[Cron] Encontradas ${novasLicitacoes.length} novas licitações para a busca ${busca.id}`);
                    // Aqui entrará a lógica de IMPORTAR automaticamente (usando service de licitacao cruzado)
                    // E futuramente disparar o e-mail (alertas)
                }
            }

        } catch (error) {
            this.logger.error('Erro durante a execução do Cron de Diários Oficiais', error);
        }

        this.logger.log('Rotina CRON de Diários finalizada com sucesso.');
    }
}
