import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from "@nestjs/common";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { PrismaService } from "../prisma/prisma.service";

export interface EditalAnaliseResultado {
  modalidade: string;
  numero: string;
  objeto: string;
  valorEstimado: number | null;
  prazos: Array<{
    tipo: string;
    data: string;
    descricao: string;
  }>;
  documentos: Array<{
    nome: string;
    obrigatorio: boolean;
  }>;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(private prisma: PrismaService) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      this.logger.warn("GEMINI_API_KEY não configurada no .env");
    }

    this.genAI = new GoogleGenerativeAI(apiKey || "");
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
    });

    if (apiKey) {
      this.logger.log("Gemini AI inicializado com sucesso");
    }
  }

  async analisarEdital(
    texto: string,
    bidId: string,
    empresaId: string,
  ): Promise<EditalAnaliseResultado> {
    const inicioProcessamento = Date.now();

    // Criar registro de análise
    const analise = await this.prisma.editalAnalise.create({
      data: {
        bidId,
        empresaId,
        status: "PROCESSANDO",
      },
    });

    try {
      this.logger.log(`Iniciando análise do edital (ID: ${analise.id})`);

      // Truncar texto se necessário
      const textoTruncado = this.truncarTexto(texto, 400000);

      // Montar prompt estruturado
      const prompt = this.montarPrompt(textoTruncado);

      // Chamar Gemini
      this.logger.log("Chamando Gemini API...");

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const resultadoTexto = response.text();

      this.logger.log("Gemini respondeu com sucesso");

      // Parse do JSON (remover possível markdown wrapper)
      let resultadoParsed: EditalAnaliseResultado;
      try {
        const jsonText = resultadoTexto
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();
        resultadoParsed = JSON.parse(jsonText);
      } catch {
        this.logger.error(
          "Erro ao fazer parse do JSON retornado pela IA:",
          resultadoTexto.substring(0, 500),
        );
        throw new InternalServerErrorException(
          "IA retornou resposta inválida",
        );
      }

      // Validar estrutura mínima
      this.validarResultado(resultadoParsed);

      // Atualizar registro de análise
      const tempoSegundos = Math.floor(
        (Date.now() - inicioProcessamento) / 1000,
      );

      await this.prisma.editalAnalise.update({
        where: { id: analise.id },
        data: {
          resultado: resultadoParsed as any,
          tokensUsados: 0, // Gemini não retorna contagem de tokens facilmente
          tempoSegundos,
          status: "CONCLUIDA",
        },
      });

      this.logger.log(`Análise concluída em ${tempoSegundos}s`);

      return resultadoParsed;
    } catch (error: any) {
      this.logger.error("Erro na análise:", error.message);

      // Atualizar registro com erro
      await this.prisma.editalAnalise.update({
        where: { id: analise.id },
        data: {
          status: "ERRO",
          erroMensagem: error.message,
          tempoSegundos: Math.floor(
            (Date.now() - inicioProcessamento) / 1000,
          ),
        },
      });

      // Se já é InternalServerErrorException, propagar
      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      // Erros específicos do Gemini
      const errorMessage = error.message || "";

      if (errorMessage.includes("API_KEY_INVALID") || errorMessage.includes("API key not valid")) {
        throw new InternalServerErrorException(
          "API Key do Gemini inválida. Verifique a configuração no .env.",
        );
      }

      if (errorMessage.includes("quota") || errorMessage.includes("RATE_LIMIT")) {
        throw new InternalServerErrorException(
          "Limite de requisições do Gemini atingido. Tente novamente em 1 minuto.",
        );
      }

      if (errorMessage.includes("SAFETY")) {
        throw new InternalServerErrorException(
          "O conteúdo foi bloqueado pelo filtro de segurança do Gemini. Tente com outro edital.",
        );
      }

      throw new InternalServerErrorException(
        `Erro ao processar análise do edital: ${errorMessage}`,
      );
    }
  }

  private truncarTexto(texto: string, maxCaracteres: number): string {
    if (texto.length <= maxCaracteres) {
      return texto;
    }

    // Estratégia: 80% início + 20% fim (geralmente prazos ficam no final)
    const inicioLength = Math.floor(maxCaracteres * 0.8);
    const fimLength = Math.floor(maxCaracteres * 0.2);

    const inicio = texto.substring(0, inicioLength);
    const fim = texto.substring(texto.length - fimLength);

    this.logger.warn(
      `Texto truncado de ${texto.length} para ${maxCaracteres} caracteres`,
    );

    return `${inicio}\n\n[... TEXTO TRUNCADO ...]\n\n${fim}`;
  }

  private montarPrompt(textoEdital: string): string {
    return `Você é um especialista em análise de editais de licitação pública brasileira.

Analise o edital abaixo e retorne APENAS um JSON válido (sem markdown, sem texto extra):

{
  "modalidade": "PREGAO_ELETRONICO | PREGAO_PRESENCIAL | TOMADA_PRECOS | CONCORRENCIA | CONVITE | DISPENSA | INEXIGIBILIDADE",
  "numero": "número do edital (ex: 001/2026, PE 123/2025)",
  "objeto": "descrição resumida do objeto da licitação (máximo 500 caracteres)",
  "valorEstimado": valor numérico em reais (somente número, sem R$ ou pontos) ou null se não informado,
  "prazos": [
    {
      "tipo": "Abertura | Entrega de Propostas | Impugnação | Recurso | Sessão Pública | etc",
      "data": "YYYY-MM-DD",
      "descricao": "descrição do prazo"
    }
  ],
  "documentos": [
    {
      "nome": "nome completo do documento solicitado",
      "obrigatorio": true ou false
    }
  ]
}

INSTRUÇÕES:
1. Retorne APENAS o JSON, sem texto antes ou depois, sem markdown
2. Use aspas duplas em todas as strings
3. Datas no formato YYYY-MM-DD
4. Para modalidade, use EXATAMENTE um dos valores listados (MAIÚSCULAS com underline)
5. Liste TODOS os prazos mencionados
6. Liste TODOS os documentos solicitados
7. Se não encontrar, use null para números ou "" para strings
8. Para valorEstimado, extraia APENAS o número (ex: "R$ 150.000,00" → 150000)

EDITAL:
${textoEdital}`;
  }

  private validarResultado(resultado: any): void {
    if (!resultado.modalidade || !resultado.objeto) {
      throw new InternalServerErrorException(
        "IA não conseguiu extrair informações mínimas (modalidade ou objeto)",
      );
    }

    if (!Array.isArray(resultado.prazos)) {
      resultado.prazos = [];
    }

    if (!Array.isArray(resultado.documentos)) {
      resultado.documentos = [];
    }
  }
}
