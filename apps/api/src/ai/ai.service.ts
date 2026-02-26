import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from "@nestjs/common";
import OpenAI from "openai";
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
  private openai: OpenAI;

  constructor(private prisma: PrismaService) {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      this.logger.warn("OPENAI_API_KEY não configurada no .env");
    }

    this.openai = new OpenAI({ apiKey: apiKey || "" });

    if (apiKey) {
      this.logger.log("OpenAI GPT-4o inicializado com sucesso");
    }
  }

  async analisarEdital(
    texto: string,
    bidId: string,
    empresaId: string,
  ): Promise<EditalAnaliseResultado> {
    const inicioProcessamento = Date.now();

    const analise = await this.prisma.editalAnalise.create({
      data: { bidId, empresaId, status: "PROCESSANDO" },
    });

    try {
      this.logger.log(`Iniciando análise (ID: ${analise.id})`);

      // Limite conservador: ~80k chars ≈ 20k tokens, deixando margem para
      // prompt (~500 tokens) + resposta (~4k tokens) dentro do limite de 30k TPM
      const textoTruncado = this.truncarTexto(texto, 80000);
      this.logger.log(`Texto: ${textoTruncado.length} chars (original: ${texto.length})`);

      this.logger.log("Chamando OpenAI GPT-4o...");

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "Você é um especialista em editais de licitação pública brasileira. Sempre retorne JSON válido.",
          },
          {
            role: "user",
            content: this.montarPrompt(textoTruncado),
          },
        ],
        temperature: 0.1,
        max_tokens: 4096,
        response_format: { type: "json_object" },
      });

      const tokensUsados = completion.usage?.total_tokens || 0;
      const resultadoTexto = completion.choices[0].message.content;

      this.logger.log(`OpenAI respondeu (${tokensUsados} tokens)`);

      let resultadoParsed: EditalAnaliseResultado;
      try {
        resultadoParsed = JSON.parse(resultadoTexto || "{}");
      } catch {
        this.logger.error(
          "Erro ao parsear JSON:",
          resultadoTexto?.substring(0, 500),
        );
        throw new InternalServerErrorException(
          "IA retornou resposta inválida",
        );
      }

      this.validarResultado(resultadoParsed);

      const tempoSegundos = Math.floor(
        (Date.now() - inicioProcessamento) / 1000,
      );

      await this.prisma.editalAnalise.update({
        where: { id: analise.id },
        data: {
          resultado: resultadoParsed as any,
          tokensUsados,
          tempoSegundos,
          status: "CONCLUIDA",
        },
      });

      this.logger.log(
        `Análise concluída em ${tempoSegundos}s (${tokensUsados} tokens)`,
      );

      return resultadoParsed;
    } catch (error: any) {
      this.logger.error("Erro:", error.message);

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

      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      const errorStatus = error.status || error.statusCode;
      const errorMessage = error.message || "";

      if (errorStatus === 429) {
        if (errorMessage.includes("quota")) {
          throw new InternalServerErrorException(
            "Cota da API OpenAI esgotada. Verifique o saldo em platform.openai.com.",
          );
        }
        throw new InternalServerErrorException(
          "Limite de requisições OpenAI atingido. Tente em 1 minuto.",
        );
      }

      if (errorStatus === 401) {
        throw new InternalServerErrorException(
          "API key OpenAI inválida. Verifique o .env.",
        );
      }

      throw new InternalServerErrorException(
        `Erro ao processar análise: ${errorMessage}`,
      );
    }
  }

  async chatComEdital(analiseJson: string, pergunta: string): Promise<string> {
    const prompt = `SISTEMA:
Você é um assistente especializado em licitações públicas brasileiras,
com profundo conhecimento da Lei 14.133/2021, Lei 8.666/93 e demais
normas de contratação pública.
Sua função é responder perguntas sobre o edital analisado abaixo.
REGRAS OBRIGATÓRIAS:

Responda APENAS com base nas informações presentes na análise do edital
Se a informação não estiver na análise, diga claramente:
"Esta informação não consta na análise do edital disponível."
Seja objetivo e direto — máximo 3 parágrafos por resposta
Use linguagem clara, sem jargões desnecessários
Nunca invente valores, datas ou requisitos

ANÁLISE DO EDITAL:
${analiseJson}
PERGUNTA DO USUÁRIO:
${pergunta}`;

    this.logger.log("Chamando OpenAI GPT-4o para chat com edital...");
    const completion = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.1,
      max_tokens: 1024,
    });

    const resposta = completion.choices[0].message.content?.trim();
    if (!resposta) {
      throw new InternalServerErrorException(
        "IA não retornou resposta para a pergunta",
      );
    }

    return resposta;
  }

  private truncarTexto(texto: string, maxCaracteres: number): string {
    if (texto.length <= maxCaracteres) {
      return texto;
    }

    const inicioLength = Math.floor(maxCaracteres * 0.8);
    const fimLength = Math.floor(maxCaracteres * 0.2);

    this.logger.warn(
      `Texto truncado: ${texto.length} -> ${maxCaracteres} chars`,
    );

    return (
      texto.substring(0, inicioLength) +
      "\n\n[...TRUNCADO...]\n\n" +
      texto.substring(texto.length - fimLength)
    );
  }

  private montarPrompt(textoEdital: string): string {
    return `Analise o edital de licitação abaixo e extraia as informações em JSON:

{
  "modalidade": "PREGAO_ELETRONICO | PREGAO_PRESENCIAL | TOMADA_PRECOS | CONCORRENCIA | CONVITE | DISPENSA | INEXIGIBILIDADE",
  "numero": "número do edital (ex: 001/2025)",
  "objeto": "descrição resumida do objeto (máx 500 chars)",
  "valorEstimado": valor numérico em reais ou null,
  "prazos": [
    {
      "tipo": "Abertura | Entrega de Propostas | Impugnação | etc",
      "data": "YYYY-MM-DD",
      "descricao": "descrição do prazo"
    }
  ],
  "documentos": [
    {
      "nome": "nome completo do documento",
      "obrigatorio": true ou false
    }
  ]
}

INSTRUÇÕES:
- Retorne APENAS o JSON, sem texto adicional
- Datas no formato YYYY-MM-DD
- Modalidade em MAIÚSCULAS com underline
- Liste TODOS os prazos e documentos encontrados
- valorEstimado apenas o número (ex: 150000, não "R$ 150.000,00")

EDITAL:
${textoEdital}`;
  }

  private validarResultado(resultado: any): void {
    if (!resultado.modalidade || !resultado.objeto) {
      throw new InternalServerErrorException(
        "IA não extraiu informações mínimas do edital",
      );
    }
    if (!Array.isArray(resultado.prazos)) resultado.prazos = [];
    if (!Array.isArray(resultado.documentos)) resultado.documentos = [];
  }
}
