/**
 * Testes unitários para validações Zod de validade de documentos
 *
 * Cobre:
 * - documentValiditySchema (coerência doesExpire + expiresAt)
 * - createDocumentSchema (com campos de validade)
 * - updateDocumentSchema (com campos de validade)
 * - Combinações inválidas
 */

import {
  documentValiditySchema,
  createDocumentSchema,
  updateDocumentSchema,
  DocumentCategory,
} from "@licitafacil/shared";

describe("DocumentValiditySchemas", () => {
  describe("documentValiditySchema", () => {
    it("deve aceitar doesExpire=false com expiresAt=null", () => {
      const result = documentValiditySchema.safeParse({
        doesExpire: false,
        issuedAt: null,
        expiresAt: null,
      });
      expect(result.success).toBe(true);
    });

    it("deve aceitar doesExpire=true com expiresAt fornecido", () => {
      const result = documentValiditySchema.safeParse({
        doesExpire: true,
        issuedAt: "2024-01-01T00:00:00Z",
        expiresAt: "2024-12-31T00:00:00Z",
      });
      expect(result.success).toBe(true);
    });

    it("deve rejeitar doesExpire=true sem expiresAt", () => {
      const result = documentValiditySchema.safeParse({
        doesExpire: true,
        issuedAt: null,
        expiresAt: null,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.some((e) => e.path.includes("expiresAt"))).toBe(true);
      }
    });

    it("deve rejeitar doesExpire=false com expiresAt fornecido", () => {
      const result = documentValiditySchema.safeParse({
        doesExpire: false,
        issuedAt: null,
        expiresAt: "2024-12-31T00:00:00Z",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.some((e) => e.path.includes("expiresAt"))).toBe(true);
      }
    });

    it("deve rejeitar expiresAt anterior a issuedAt", () => {
      const result = documentValiditySchema.safeParse({
        doesExpire: true,
        issuedAt: "2024-12-31T00:00:00Z",
        expiresAt: "2024-01-01T00:00:00Z", // Antes de issuedAt
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.some((e) => e.message.includes("posterior"))).toBe(true);
      }
    });

    it("deve aceitar expiresAt posterior a issuedAt", () => {
      const result = documentValiditySchema.safeParse({
        doesExpire: true,
        issuedAt: "2024-01-01T00:00:00Z",
        expiresAt: "2024-12-31T00:00:00Z",
      });
      expect(result.success).toBe(true);
    });

    it("deve aceitar issuedAt=null com expiresAt fornecido", () => {
      const result = documentValiditySchema.safeParse({
        doesExpire: true,
        issuedAt: null,
        expiresAt: "2024-12-31T00:00:00Z",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("createDocumentSchema", () => {
    it("deve aceitar documento sem campos de validade (opcional)", () => {
      const result = createDocumentSchema.safeParse({
        name: "Documento Teste",
        category: DocumentCategory.OUTROS,
      });
      expect(result.success).toBe(true);
    });

    it("deve aceitar documento com validade completa", () => {
      const result = createDocumentSchema.safeParse({
        name: "Documento Teste",
        category: DocumentCategory.CERTIFICADOS,
        doesExpire: true,
        issuedAt: "2024-01-01T00:00:00Z",
        expiresAt: "2024-12-31T00:00:00Z",
      });
      expect(result.success).toBe(true);
    });

    it("deve rejeitar documento com doesExpire=true sem expiresAt", () => {
      const result = createDocumentSchema.safeParse({
        name: "Documento Teste",
        category: DocumentCategory.CERTIFICADOS,
        doesExpire: true,
        expiresAt: null,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateDocumentSchema", () => {
    it("deve aceitar atualização apenas de name", () => {
      const result = updateDocumentSchema.safeParse({
        name: "Novo Nome",
      });
      expect(result.success).toBe(true);
    });

    it("deve aceitar atualização apenas de campos de validade", () => {
      const result = updateDocumentSchema.safeParse({
        doesExpire: true,
        expiresAt: "2024-12-31T00:00:00Z",
      });
      expect(result.success).toBe(true);
    });

    it("deve aceitar atualização completa", () => {
      const result = updateDocumentSchema.safeParse({
        name: "Novo Nome",
        category: DocumentCategory.LICENCAS,
        doesExpire: true,
        issuedAt: "2024-01-01T00:00:00Z",
        expiresAt: "2024-12-31T00:00:00Z",
      });
      expect(result.success).toBe(true);
    });

    it("deve rejeitar atualização com doesExpire=true sem expiresAt", () => {
      const result = updateDocumentSchema.safeParse({
        doesExpire: true,
        expiresAt: null,
      });
      expect(result.success).toBe(false);
    });

    it("deve aceitar remover validade (doesExpire=false)", () => {
      const result = updateDocumentSchema.safeParse({
        doesExpire: false,
        expiresAt: null,
      });
      expect(result.success).toBe(true);
    });
  });
});
