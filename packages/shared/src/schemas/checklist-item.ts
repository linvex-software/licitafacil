import { z } from "zod";

/**
 * Categorias de itens de checklist
 */
export const ChecklistItemCategory = {
  DOCUMENTACAO: "DOCUMENTACAO",
  PRAZO: "PRAZO",
  TECNICA: "TECNICA",
  FINANCEIRA: "FINANCEIRA",
  JURIDICA: "JURIDICA",
  OUTRA: "OUTRA",
} as const;

/**
 * Schema de validação para criar um item de checklist
 */
export const createChecklistItemSchema = z.object({
  licitacaoId: z.string().uuid("ID da licitação inválido"),
  titulo: z.string().min(1, "Título é obrigatório").max(500, "Título muito longo"),
  descricao: z.string().max(2000, "Descrição muito longa").optional().nullable(),
  category: z
    .enum([
      ChecklistItemCategory.DOCUMENTACAO,
      ChecklistItemCategory.PRAZO,
      ChecklistItemCategory.TECNICA,
      ChecklistItemCategory.FINANCEIRA,
      ChecklistItemCategory.JURIDICA,
      ChecklistItemCategory.OUTRA,
    ])
    .optional()
    .nullable(),
  exigeEvidencia: z.boolean().default(false),
  isCritical: z.boolean().default(false),
  evidenciaId: z.string().uuid("ID da evidência inválido").optional().nullable(),
});

/**
 * Schema de validação para atualizar um item de checklist
 */
export const updateChecklistItemSchema = z.object({
  titulo: z.string().min(1, "Título é obrigatório").max(500, "Título muito longo").optional(),
  descricao: z.string().max(2000, "Descrição muito longa").optional().nullable(),
  category: z
    .enum([
      ChecklistItemCategory.DOCUMENTACAO,
      ChecklistItemCategory.PRAZO,
      ChecklistItemCategory.TECNICA,
      ChecklistItemCategory.FINANCEIRA,
      ChecklistItemCategory.JURIDICA,
      ChecklistItemCategory.OUTRA,
    ])
    .optional()
    .nullable(),
  exigeEvidencia: z.boolean().optional(),
  isCritical: z.boolean().optional(),
  evidenciaId: z.string().uuid("ID da evidência inválido").optional().nullable(),
});

/**
 * Schema de validação para marcar item como concluído
 */
export const markChecklistItemCompletedSchema = z.object({
  evidenciaId: z.string().uuid("ID da evidência inválido").optional().nullable(),
});

/**
 * Schema de validação para LicitacaoChecklistItem completo
 */
export const licitacaoChecklistItemSchema = z.object({
  id: z.string().uuid(),
  empresaId: z.string().uuid(),
  licitacaoId: z.string().uuid(),
  titulo: z.string(),
  descricao: z.string().nullable(),
  category: z.string().nullable(),
  exigeEvidencia: z.boolean(),
  isCritical: z.boolean(),
  concluido: z.boolean(),
  concluidoPor: z.string().uuid().nullable(),
  concluidoEm: z.string().datetime().nullable(),
  evidenciaId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type LicitacaoChecklistItem = z.infer<typeof licitacaoChecklistItemSchema>;
export type CreateLicitacaoChecklistItemInput = z.infer<typeof createChecklistItemSchema>;
export type UpdateLicitacaoChecklistItemInput = z.infer<typeof updateChecklistItemSchema>;
export type MarkLicitacaoChecklistItemCompletedInput = z.infer<typeof markChecklistItemCompletedSchema>;
export type ChecklistItemCategoryType = keyof typeof ChecklistItemCategory;
