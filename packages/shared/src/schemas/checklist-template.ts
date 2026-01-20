import { z } from "zod";
import { BidModality } from "./bid";

/**
 * Categorias de itens do checklist
 */
export const ChecklistItemCategory = {
  DOCUMENTACAO: "DOCUMENTACAO",
  FINANCEIRO: "FINANCEIRO",
  TECNICO: "TECNICO",
  JURIDICO: "JURIDICO",
  ADMINISTRATIVO: "ADMINISTRATIVO",
  OUTROS: "OUTROS",
} as const;

/**
 * Schema para um item do checklist (input - ID opcional)
 */
export const checklistItemInputSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, "Título é obrigatório").max(500, "Título muito longo"),
  description: z.string().max(1000, "Descrição muito longa").optional().nullable(),
  required: z.boolean().default(false),
  order: z.number().int().positive("Ordem deve ser um número positivo"),
  category: z
    .enum([
      ChecklistItemCategory.DOCUMENTACAO,
      ChecklistItemCategory.FINANCEIRO,
      ChecklistItemCategory.TECNICO,
      ChecklistItemCategory.JURIDICO,
      ChecklistItemCategory.ADMINISTRATIVO,
      ChecklistItemCategory.OUTROS,
    ])
    .optional()
    .nullable(),
});

/**
 * Schema para um item do checklist (output - ID obrigatório)
 */
export const checklistItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, "Título é obrigatório").max(500, "Título muito longo"),
  description: z.string().max(1000, "Descrição muito longa").optional().nullable(),
  required: z.boolean().default(false),
  order: z.number().int().positive("Ordem deve ser um número positivo"),
  category: z
    .enum([
      ChecklistItemCategory.DOCUMENTACAO,
      ChecklistItemCategory.FINANCEIRO,
      ChecklistItemCategory.TECNICO,
      ChecklistItemCategory.JURIDICO,
      ChecklistItemCategory.ADMINISTRATIVO,
      ChecklistItemCategory.OUTROS,
    ])
    .optional()
    .nullable(),
});

/**
 * Schema de validação para criar um template de checklist
 */
export const createChecklistTemplateSchema = z.object({
  modality: z.enum([
    BidModality.PREGAO_ELETRONICO,
    BidModality.CONCORRENCIA,
    BidModality.DISPENSA,
    BidModality.OUTRA,
  ]),
  name: z.string().min(1, "Nome é obrigatório").max(200, "Nome muito longo"),
  description: z.string().max(500, "Descrição muito longa").optional().nullable(),
  items: z
    .array(checklistItemInputSchema)
    .min(1, "Deve ter pelo menos um item no checklist"),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
});

/**
 * Schema de validação para atualizar um template de checklist
 */
export const updateChecklistTemplateSchema = z.object({
  modality: z
    .enum([
      BidModality.PREGAO_ELETRONICO,
      BidModality.CONCORRENCIA,
      BidModality.DISPENSA,
      BidModality.OUTRA,
    ])
    .optional(),
  name: z.string().min(1, "Nome é obrigatório").max(200, "Nome muito longo").optional(),
  description: z.string().max(500, "Descrição muito longa").optional().nullable(),
  items: z
    .array(checklistItemInputSchema)
    .min(1, "Deve ter pelo menos um item no checklist")
    .optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

/**
 * Schema de validação para ChecklistTemplate completo
 */
export const checklistTemplateSchema = z.object({
  id: z.string().uuid(),
  empresaId: z.string().uuid(),
  modality: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  items: z.array(checklistItemSchema),
  isActive: z.boolean(),
  isDefault: z.boolean(),
  createdBy: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable(),
});

export type ChecklistTemplate = z.infer<typeof checklistTemplateSchema>;
export type ChecklistItem = z.infer<typeof checklistItemSchema>;
export type CreateChecklistTemplateInput = z.infer<typeof createChecklistTemplateSchema>;
export type UpdateChecklistTemplateInput = z.infer<typeof updateChecklistTemplateSchema>;
export type ChecklistItemCategoryType = keyof typeof ChecklistItemCategory;
