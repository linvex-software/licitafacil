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
 * Schema de validação para criar um documento (via upload)
 * Note: O arquivo é enviado via multipart/form-data, então este schema
 * valida apenas os metadados (name, category), não o arquivo em si
 */
export const createDocumentSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(255, "Nome muito longo"),
  category: z.enum([
    DocumentCategory.CONTRATOS,
    DocumentCategory.CERTIFICADOS,
    DocumentCategory.LICENCAS,
    DocumentCategory.FINANCEIRO,
    DocumentCategory.ADMINISTRATIVO,
    DocumentCategory.OUTROS,
  ]),
});

/**
 * Schema de validação para atualizar um documento
 */
export const updateDocumentSchema = z.object({
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
});

/**
 * Schema de validação para Document (Documento) completo
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
});

export type Document = z.infer<typeof documentSchema>;
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type DocumentCategoryType = keyof typeof DocumentCategory;
