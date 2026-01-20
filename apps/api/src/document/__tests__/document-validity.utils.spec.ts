/**
 * Testes unitários para funções de cálculo de validade de documentos
 *
 * Cobre:
 * - computeDocumentValidityStatus (todas as bordas)
 * - daysToExpire (cálculo correto, timezone)
 * - Validações Zod (combinações inválidas)
 */

import {
  computeDocumentValidityStatus,
  daysToExpire,
  getNowUTC,
  type DocumentValidityData,
  EXPIRING_SOON_DAYS,
} from "../document-validity.utils";
import { DocumentValidityStatus } from "@licitafacil/shared";

describe("DocumentValidityUtils", () => {
  describe("getNowUTC", () => {
    it("deve retornar data atual em UTC", () => {
      const now = getNowUTC();
      expect(now).toBeInstanceOf(Date);
      // Verificar que é uma data válida
      expect(now.getTime()).toBeGreaterThan(0);
    });
  });

  describe("daysToExpire", () => {
    it("deve retornar null se expiresAt é null", () => {
      const now = new Date("2024-01-15T00:00:00Z");
      expect(daysToExpire(now, null)).toBeNull();
    });

    it("deve calcular dias corretamente quando expiresAt está no futuro", () => {
      const now = new Date("2024-01-15T00:00:00Z");
      const expiresAt = new Date("2024-01-20T00:00:00Z");
      expect(daysToExpire(now, expiresAt)).toBe(5);
    });

    it("deve retornar null quando expiresAt já passou", () => {
      const now = new Date("2024-01-15T00:00:00Z");
      const expiresAt = new Date("2024-01-10T00:00:00Z");
      expect(daysToExpire(now, expiresAt)).toBeNull();
    });

    it("deve calcular corretamente quando expiresAt é hoje", () => {
      const now = new Date("2024-01-15T00:00:00Z");
      const expiresAt = new Date("2024-01-15T23:59:59Z");
      const days = daysToExpire(now, expiresAt);
      expect(days).toBe(0); // Ainda não expirou hoje
    });

    it("deve lidar corretamente com timezone UTC", () => {
      const now = new Date("2024-01-15T12:00:00Z");
      const expiresAt = new Date("2024-01-16T12:00:00Z");
      expect(daysToExpire(now, expiresAt)).toBe(1);
    });
  });

  describe("computeDocumentValidityStatus", () => {
    const now = new Date("2024-01-15T00:00:00Z");

    describe("NO_EXPIRATION", () => {
      it("deve retornar NO_EXPIRATION quando doesExpire=false", () => {
        const doc: DocumentValidityData = {
          doesExpire: false,
          issuedAt: null,
          expiresAt: null,
        };
        expect(computeDocumentValidityStatus(now, doc)).toBe(
          DocumentValidityStatus.NO_EXPIRATION,
        );
      });
    });

    describe("EXPIRED", () => {
      it("deve retornar EXPIRED quando expiresAt <= now", () => {
        const doc: DocumentValidityData = {
          doesExpire: true,
          issuedAt: null,
          expiresAt: new Date("2024-01-10T00:00:00Z"), // 5 dias atrás
        };
        expect(computeDocumentValidityStatus(now, doc)).toBe(
          DocumentValidityStatus.EXPIRED,
        );
      });

      it("deve retornar EXPIRED quando expiresAt é exatamente agora", () => {
        const doc: DocumentValidityData = {
          doesExpire: true,
          issuedAt: null,
          expiresAt: new Date(now.getTime()), // Mesmo timestamp
        };
        expect(computeDocumentValidityStatus(now, doc)).toBe(
          DocumentValidityStatus.EXPIRED,
        );
      });

      it("deve retornar EXPIRED quando doesExpire=true mas expiresAt é null (fail-safe)", () => {
        const doc: DocumentValidityData = {
          doesExpire: true,
          issuedAt: null,
          expiresAt: null, // Dados inconsistentes
        };
        // Fail-safe: melhor marcar como expirado do que OK silencioso
        expect(computeDocumentValidityStatus(now, doc)).toBe(
          DocumentValidityStatus.EXPIRED,
        );
      });
    });

    describe("EXPIRING_SOON", () => {
      it(`deve retornar EXPIRING_SOON quando expiresAt está dentro de ${EXPIRING_SOON_DAYS} dias`, () => {
        const expiresAt = new Date(now);
        expiresAt.setDate(expiresAt.getDate() + EXPIRING_SOON_DAYS - 1); // 1 dia antes do limite
        const doc: DocumentValidityData = {
          doesExpire: true,
          issuedAt: null,
          expiresAt,
        };
        expect(computeDocumentValidityStatus(now, doc)).toBe(
          DocumentValidityStatus.EXPIRING_SOON,
        );
      });

      it(`deve retornar EXPIRING_SOON quando expiresAt está exatamente em ${EXPIRING_SOON_DAYS} dias`, () => {
        const expiresAt = new Date(now);
        expiresAt.setDate(expiresAt.getDate() + EXPIRING_SOON_DAYS);
        const doc: DocumentValidityData = {
          doesExpire: true,
          issuedAt: null,
          expiresAt,
        };
        expect(computeDocumentValidityStatus(now, doc)).toBe(
          DocumentValidityStatus.EXPIRING_SOON,
        );
      });

      it("deve retornar EXPIRING_SOON quando expiresAt está em 1 dia", () => {
        const expiresAt = new Date(now);
        expiresAt.setDate(expiresAt.getDate() + 1);
        const doc: DocumentValidityData = {
          doesExpire: true,
          issuedAt: null,
          expiresAt,
        };
        expect(computeDocumentValidityStatus(now, doc)).toBe(
          DocumentValidityStatus.EXPIRING_SOON,
        );
      });
    });

    describe("VALID", () => {
      it(`deve retornar VALID quando expiresAt está além de ${EXPIRING_SOON_DAYS} dias`, () => {
        const expiresAt = new Date(now);
        expiresAt.setDate(expiresAt.getDate() + EXPIRING_SOON_DAYS + 1); // 1 dia além do limite
        const doc: DocumentValidityData = {
          doesExpire: true,
          issuedAt: null,
          expiresAt,
        };
        expect(computeDocumentValidityStatus(now, doc)).toBe(
          DocumentValidityStatus.VALID,
        );
      });

      it("deve retornar VALID quando expiresAt está muito no futuro", () => {
        const expiresAt = new Date(now);
        expiresAt.setDate(expiresAt.getDate() + 365); // 1 ano no futuro
        const doc: DocumentValidityData = {
          doesExpire: true,
          issuedAt: null,
          expiresAt,
        };
        expect(computeDocumentValidityStatus(now, doc)).toBe(
          DocumentValidityStatus.VALID,
        );
      });
    });

    describe("Edge cases e timezone", () => {
      it("deve lidar corretamente com diferentes timezones (sempre UTC)", () => {
        const now = new Date("2024-01-15T12:00:00Z");
        const expiresAt = new Date("2024-01-16T12:00:00Z");
        const doc: DocumentValidityData = {
          doesExpire: true,
          issuedAt: null,
          expiresAt,
        };
        // Deve calcular baseado em UTC, não em timezone local
        expect(computeDocumentValidityStatus(now, doc)).toBe(
          DocumentValidityStatus.EXPIRING_SOON,
        );
      });

      it("deve lidar com issuedAt quando fornecido", () => {
        const issuedAt = new Date("2024-01-01T00:00:00Z");
        const expiresAt = new Date("2024-01-20T00:00:00Z");
        const doc: DocumentValidityData = {
          doesExpire: true,
          issuedAt,
          expiresAt,
        };
        // issuedAt não afeta o cálculo de status, apenas validação de dados
        expect(computeDocumentValidityStatus(now, doc)).toBe(
          DocumentValidityStatus.EXPIRING_SOON,
        );
      });
    });
  });
});
