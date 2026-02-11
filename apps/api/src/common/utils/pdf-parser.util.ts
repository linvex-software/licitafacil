import { BadRequestException, Logger } from "@nestjs/common";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require("pdf-parse");

export class PdfParserUtil {
  private static readonly logger = new Logger(PdfParserUtil.name);

  /**
   * Extrai texto de um buffer de PDF
   */
  static async extrairTexto(buffer: Buffer): Promise<string> {
    try {
      this.logger.log(`Extraindo texto de PDF (${buffer.length} bytes)`);

      const data = await pdfParse(buffer);

      this.logger.log(
        `Texto extraído: ${data.numpages} páginas, ${data.text.length} caracteres`,
      );

      // Limpeza básica do texto
      let texto = data.text;

      // Remover múltiplas quebras de linha
      texto = texto.replace(/\n{3,}/g, "\n\n");

      // Remover espaços extras
      texto = texto.replace(/ {2,}/g, " ");

      // Trim
      texto = texto.trim();

      if (texto.length < 100) {
        throw new BadRequestException(
          "PDF parece estar vazio ou corrompido (menos de 100 caracteres extraídos)",
        );
      }

      return texto;
    } catch (error) {
      this.logger.error("Erro ao extrair texto do PDF:", error);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(
        "Não foi possível extrair texto do PDF. Verifique se o arquivo está corrompido.",
      );
    }
  }

  /**
   * Valida tamanho do PDF
   */
  static validarTamanho(buffer: Buffer, maxMB: number = 50): void {
    const tamanhoMB = buffer.length / (1024 * 1024);

    if (tamanhoMB > maxMB) {
      throw new BadRequestException(
        `PDF muito grande (${tamanhoMB.toFixed(2)}MB). Máximo permitido: ${maxMB}MB`,
      );
    }
  }
}
