import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import axios from 'axios';
import { PrismaService } from '../../prisma/prisma.service';
import { BuscarDiariosDto } from './dto/buscar-diarios.dto';

// Interface padronizada para o retorno de scrapers
export interface ScrapedLicitacao {
    orgao: string;
    objeto: string;
    dataPublicacao: string;
    linkPdf: string;
    uf: string;
    municipio?: string;
    // Campos auxiliares para facilitar a importação
    modalidadeNome?: string;
    numeroAviso?: string;
}

@Injectable()
export class DiariosService {
    private readonly logger = new Logger(DiariosService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Main entrypoint para a busca de licitações em Diários
     */
    async buscarLicitacoesDiarios(_empresaId: string, filters: BuscarDiariosDto): Promise<ScrapedLicitacao[]> {
        this.logger.log(`Iniciando busca em Diários. UF: ${filters.uf}`);

        let resultados: ScrapedLicitacao[] = [];

        // Factory simples para decidir qual scraper usar baseado na UF
        switch (filters.uf.toUpperCase()) {
            case 'SP':
                resultados = await this.scrapeDosp(filters);
                break;
            case 'RJ':
                resultados = await this.scrapeDorj(filters);
                break;
            case 'MG':
                resultados = await this.scrapeDomg(filters);
                break;
            default:
                this.logger.warn(`Scraper real para UF ${filters.uf} ainda não mapeado. Retornando lista vazia.`);
                resultados = [];
                break;
        }

        // Filtra por keywords se houver
        if (filters.keywords && filters.keywords.length > 0) {
            const kws = filters.keywords;
            resultados = resultados.filter(item => {
                const text = `${item.orgao} ${item.objeto}`.toLowerCase();
                return kws.some((kw: string) => text.includes(kw.toLowerCase()));
            });
        }

        // Registra a fonte como varrida com sucesso
        await this.registrarSincronizacao(filters.uf, filters.municipio);

        return resultados;
    }

    /**
     * Importa as licitações selecionadas no Frontend para a tabela de Bids da Empresa
     */
    async importarLicitacoesDiarios(empresaId: string, licitacoes: ScrapedLicitacao[]) {
        let importadas = 0;
        let duplicadas = 0;

        for (const item of licitacoes) {
            // Lógica de desduplicação simples baseada no órgão e objeto
            const bidExistente = await this.prisma.bid.findFirst({
                where: {
                    empresaId,
                    agency: item.orgao,
                    title: item.objeto,
                }
            });

            if (bidExistente) {
                duplicadas++;
                continue;
            }

            // Cria a licitação ativa importada
            await this.prisma.bid.create({
                data: {
                    empresaId,
                    title: item.objeto,
                    agency: item.orgao,
                    uf: item.uf.toUpperCase(),
                    municipio: item.municipio || null,
                    modality: item.modalidadeNome || 'Outra',
                    legalStatus: 'Publicado',
                    operationalState: 'A_INICIAR', // Estado inicial padrão
                }
            });

            importadas++;
        }

        return { importadas, duplicadas };
    }

    /**
     * Scraper V1 - Diário Oficial do Estado de São Paulo (DOSP)
     * Utilizando o portal da Imprensa Oficial SP
     */
    private async scrapeDosp(_filters: BuscarDiariosDto): Promise<ScrapedLicitacao[]> {
        this.logger.log('Executando scraper DOSP...');
        const resultados: ScrapedLicitacao[] = [];

        try {
            // URL de busca pública de licitações da Imprensa Oficial do Estado de São Paulo
            // Usamos uma URL fixa de busca avançada como exemplo
            const url = 'https://www.imprensaoficial.com.br/DO/BuscaDO2001_11_2.aspx';

            // Em um ambiente real, os filtros como dataInicio, dataFim, e keywords seriam passados nos params/payload
            const response = await axios.get(url, { timeout: 15000 });
            const $ = cheerio.load(response.data);

            // Supomos que a tabela de resultados tem a classe css '.tabela-resultados tr'
            // O modelo abaixo assume uma estrutura hipotética do portal da IOESP
            $('.tabela-resultados tr').each((index, element) => {
                // Pular cabeçalho
                if (index === 0) return;

                const tds = $(element).find('td');
                if (tds.length >= 4) {
                    const dataPub = $(tds[0]).text().trim(); // Ex: 25/02/2026
                    const orgao = $(tds[1]).text().trim();
                    const objeto = $(tds[2]).text().trim();
                    const pdfHref = $(tds[3]).find('a').attr('href') || '';

                    // Converte data pt-BR para ISO
                    const [dia, mes, ano] = dataPub.split('/');
                    const isoDate = new Date(`${ano}-${mes}-${dia}`).toISOString();

                    resultados.push({
                        orgao: orgao || 'Governo do Estado de São Paulo',
                        objeto: objeto,
                        dataPublicacao: isoDate,
                        linkPdf: pdfHref.startsWith('http') ? pdfHref : `https://www.imprensaoficial.com.br${pdfHref}`,
                        uf: 'SP',
                    });
                }
            });

            if (resultados.length === 0) {
                this.logger.warn("Nenhum resultado extraído do HTML do DOSP. Retornando lista vazia.");
                return [];
            }

            return resultados;
        } catch (error) {
            this.logger.error('Erro ao realizar scraping no DOSP:', error);
            this.logger.warn("Falha no scraping do DOSP. Retornando lista vazia.");
            return [];
        }
    }

    /**
     * Scraper V1 - Diário Oficial do Estado do Rio de Janeiro (DORJ)
     */
    private async scrapeDorj(_filters: BuscarDiariosDto): Promise<ScrapedLicitacao[]> {
        this.logger.log('Executando scraper DORJ...');

        try {
            // URL base do Diário Oficial do RJ (IOERJ)
            const url = 'https://www.ioerj.com.br/portal/modules/utw/search.php';
            const response = await axios.get(url, { timeout: 15000 });
            const $ = cheerio.load(response.data);
            const resultados: ScrapedLicitacao[] = [];

            // Supomos estrutura '.search-result-item'
            $('.search-result-item').each((_, element) => {
                const titulo = $(element).find('h4').text().trim();
                const resumo = $(element).find('.resumo').text().trim();
                const link = $(element).find('a.btn-pdf').attr('href') || '';

                resultados.push({
                    orgao: titulo || 'Governo do Estado do Rio de Janeiro',
                    objeto: resumo,
                    dataPublicacao: new Date().toISOString(),
                    linkPdf: link.startsWith('http') ? link : `https://www.ioerj.com.br${link}`,
                    uf: 'RJ',
                });
            });

            if (resultados.length > 0) return resultados;

        } catch (error) {
            this.logger.error('Erro ao realizar scraping no DORJ:', error);
        }

        this.logger.warn("Scraping DORJ sem resultado. Retornando lista vazia.");
        return [];
    }

    /**
     * Scraper V1 - Diário Oficial do Estado de Minas Gerais (DOMG)
     */
    private async scrapeDomg(_filters: BuscarDiariosDto): Promise<ScrapedLicitacao[]> {
        this.logger.log('Executando scraper DOMG...');

        try {
            const url = 'https://www.jornalminasgerais.mg.gov.br/';
            const response = await axios.get(url, { timeout: 15000 });
            const $ = cheerio.load(response.data);
            const resultados: ScrapedLicitacao[] = [];

            // Estrutura hipotética '.materia-licitacao' no portal de MG
            $('.materia-licitacao').each((_, element) => {
                const orgao = $(element).find('.orgao').text().trim();
                const objeto = $(element).find('.texto-materia').text().trim();
                const link = $(element).find('a').attr('href') || '';

                resultados.push({
                    orgao: orgao || 'Governo do Estado de Minas Gerais',
                    objeto: objeto,
                    dataPublicacao: new Date().toISOString(),
                    linkPdf: link.startsWith('http') ? link : `https://www.jornalminasgerais.mg.gov.br${link}`,
                    uf: 'MG',
                });
            });

            if (resultados.length > 0) return resultados;

        } catch (error) {
            this.logger.error('Erro ao realizar scraping no DOMG:', error);
        }

        this.logger.warn("Scraping DOMG sem resultado. Retornando lista vazia.");
        return [];
    }

    /**
     * Registra a última sincronização com o Diário
     */
    private async registrarSincronizacao(estado: string, municipio?: string) {
        const dataAtual = new Date();

        const diarioExistente = await this.prisma.diarioOficial.findFirst({
            where: { estado, municipio: municipio || null }
        });

        if (diarioExistente) {
            await this.prisma.diarioOficial.update({
                where: { id: diarioExistente.id },
                data: { ultimaSincronizacao: dataAtual }
            });
        } else {
            await this.prisma.diarioOficial.create({
                data: {
                    estado,
                    municipio,
                    url: `https://diario-${estado.toLowerCase()}.example.com`, // Default URL
                    ultimaSincronizacao: dataAtual
                }
            });
        }
    }
}
