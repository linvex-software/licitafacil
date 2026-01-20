import { z } from "zod";

/**
 * Categorias de documentos
 */
export const DocumentCategory = {
  CONTRATOS: "CONTRATOS",
  CERTIFICADOS: "CERTIFICADOS",
  LICENCAS: "LICENCAS",
  FINANCEIRO: "FINANCEIRO",
  ADMINISTRATIVO: "ADMINISTRATIVO",
  OUTROS: "OUTROS",
} as const;

/**
 * Tipos MIME permitidos
 */
export const ALLOWED_MIME_TYPES = [
  // PDF
  "application/pdf",
  // Imagens
  "image/jpeg",
  "image/jpg",
  "image/png",
  // Office
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.ms-excel", // .xls
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
] as const;

/**
 * Tamanho máximo do arquivo em bytes (50MB)
 */
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * Schema base para campos de validade de documento (sem refinements)
 * Permite usar .partial() para PATCH
 */
const documentValidityBaseSchema = z.object({
  doesExpire: z.boolean().default(false),
  issuedAt: z.string().datetime().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
});

/**
 * Schema de validação para campos de validade de documento
 * Garante coerência entre doesExpire e expiresAt
 * Usa superRefine para permitir múltiplos erros por campo
 */
export const documentValiditySchema = documentValidityBaseSchema.superRefine(
  (data, ctx) => {
    // Regra a: doesExpire=false => expiresAt MUST be null/undefined
    if (data.doesExpire === false) {
      if (data.expiresAt !== null && data.expiresAt !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Se doesExpire=false, expiresAt deve ser null",
          path: ["expiresAt"],
        });
      }
    }

    // Regra b: doesExpire=true => expiresAt obrigatório
    if (data.doesExpire === true) {
      if (data.expiresAt === null || data.expiresAt === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Se doesExpire=true, expiresAt é obrigatório",
          path: ["expiresAt"],
        });
      }
    }

    // Regra c: se issuedAt e expiresAt existirem => expiresAt > issuedAt
    if (data.issuedAt && data.expiresAt) {
      const issuedDate = new Date(data.issuedAt);
      const expiresDate = new Date(data.expiresAt);
      if (expiresDate <= issuedDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "expiresAt deve ser posterior a issuedAt",
          path: ["expiresAt"],
        });
      }
    }
  },
);

/**
 * Schema para PATCH parcial de campos de validade
 * Não tem refinements (permite .partial())
 * A validação final será feita no service após merge com estado atual
 */
export const documentValidityPatchSchema = documentValidityBaseSchema.partial();

/**
 * Schema de validação para criar um documento (via upload)
 * Note: O arquivo é enviado via multipart/form-data, então este schema
 * valida apenas os metadados (name, category), não o arquivo em si
 *
 * Campos de validade são opcionais no create, mas se fornecidos devem ser coerentes
 */
export const createDocumentSchema = z
  .object({
    name: z.string().min(1, "Nome é obrigatório").max(255, "Nome muito longo"),
    category: z.enum([
      DocumentCategory.CONTRATOS,
      DocumentCategory.CERTIFICADOS,
      DocumentCategory.LICENCAS,
      DocumentCategory.FINANCEIRO,
      DocumentCategory.ADMINISTRATIVO,
      DocumentCategory.OUTROS,
    ]),
  })
  .merge(documentValidityBaseSchema.partial())
  .superRefine((data, ctx) => {
    // Aplicar validações de coerência apenas se campos de validade foram fornecidos
    const hasValidityFields =
      data.doesExpire !== undefined ||
      data.issuedAt !== undefined ||
      data.expiresAt !== undefined;

    if (!hasValidityFields) {
      return; // Campos de validade são opcionais no create
    }

    // Usar default se doesExpire não foi fornecido
    const doesExpire = data.doesExpire ?? false;

    // Regra a: doesExpire=false => expiresAt MUST be null/undefined
    if (doesExpire === false) {
      if (data.expiresAt !== null && data.expiresAt !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Se doesExpire=false, expiresAt deve ser null",
          path: ["expiresAt"],
        });
      }
    }

    // Regra b: doesExpire=true => expiresAt obrigatório
    if (doesExpire === true) {
      if (data.expiresAt === null || data.expiresAt === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Se doesExpire=true, expiresAt é obrigatório",
          path: ["expiresAt"],
        });
      }
    }

    // Regra c: se issuedAt e expiresAt existirem => expiresAt > issuedAt
    if (data.issuedAt && data.expiresAt) {
      const issuedDate = new Date(data.issuedAt);
      const expiresDate = new Date(data.expiresAt);
      if (expiresDate <= issuedDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "expiresAt deve ser posterior a issuedAt",
          path: ["expiresAt"],
        });
      }
    }
  });

/**
 * Schema de validação para atualizar um documento (PATCH parcial)
 * Inclui campos de validade opcionais
 *
 * IMPORTANTE: Este schema permite PATCH parcial sem refinements.
 * A validação final de coerência será feita no DocumentService.update()
 * após fazer merge do patch com o estado atual do documento.
 */
export const updateDocumentSchema = z
  .object({
    name: z.string().min(1, "Nome é obrigatório").max(255, "Nome muito longo").optional(),
    category: z
      .enum([
        DocumentCategory.CONTRATOS,
        DocumentCategory.CERTIFICADOS,
        DocumentCategory.LICENCAS,
        DocumentCategory.FINANCEIRO,
        DocumentCategory.ADMINISTRATIVO,
        DocumentCategory.OUTROS,
      ])
      .optional(),
  })
  .merge(documentValidityPatchSchema);

/**
 * Status de validade do documento (derivado, nunca setado manualmente)
 */
export const DocumentValidityStatus = {
  NO_EXPIRATION: "NO_EXPIRATION", // doesExpire=false
  VALID: "VALID", // expiresAt futuro fora da janela de expiração
  EXPIRING_SOON: "EXPIRING_SOON", // expiresAt dentro da janela configurada
  EXPIRED: "EXPIRED", // expiresAt <= agora
} as const;

/**
 * Schema de validação para Document (Documento) completo
 * Inclui campos de validade e status derivado
 */
export const documentSchema = z.object({
  id: z.string().uuid(),
  empresaId: z.string().uuid(),
  name: z.string(),
  filename: z.string(),
  mimeType: z.string(),
  size: z.number().int().positive(),
  category: z.string(),
  url: z.string(),
  uploadedBy: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  // Campos de validade
  doesExpire: z.boolean(),
  issuedAt: z.string().datetime().nullable(),
  expiresAt: z.string().datetime().nullable(),
  // Status derivado (calculado no backend)
  validityStatus: z.enum([
    DocumentValidityStatus.NO_EXPIRATION,
    DocumentValidityStatus.VALID,
    DocumentValidityStatus.EXPIRING_SOON,
    DocumentValidityStatus.EXPIRED,
  ]),
  daysToExpire: z.number().nullable(), // null se não expira ou já expirou
});

/**
 * Schema de validação para DocumentVersion (Versão de Documento)
 */
export const documentVersionSchema = z.object({
  id: z.string().uuid(),
  documentId: z.string().uuid(),
  versionNumber: z.number().int().positive(),
  filename: z.string(),
  mimeType: z.string(),
  size: z.number().int().positive(),
  url: z.string(),
  uploadedBy: z.string().uuid(),
  isCurrent: z.boolean(),
  createdAt: z.string().datetime(),
  uploader: z
    .object({
      id: z.string().uuid(),
      name: z.string(),
      email: z.string(),
    })
    .optional(),
});

export type Document = z.infer<typeof documentSchema>;
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type DocumentVersion = z.infer<typeof documentVersionSchema>;
export type DocumentCategoryType = keyof typeof DocumentCategory;
export type DocumentValidityStatusType =
  (typeof DocumentValidityStatus)[keyof typeof DocumentValidityStatus];
export type DocumentValidityInput = z.infer<typeof documentValiditySchema>;
