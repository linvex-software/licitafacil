import { z } from "zod";

/**
 * Schema de validação para criar um prazo da licitação
 */
export const createPrazoSchema = z.object({
  bidId: z.string().uuid("ID da licitação inválido"),
  titulo: z.string().min(1, "Título é obrigatório").max(500, "Título muito longo"),
  dataPrazo: z.string().min(1, "Data do prazo é obrigatória"), // ISO ou YYYY-MM-DD
  descricao: z.string().max(2000, "Descrição muito longa").optional().nullable(),
});

/**
 * Schema de validação para atualizar um prazo
 */
export const updatePrazoSchema = z.object({
  titulo: z.string().min(1, "Título é obrigatório").max(500, "Título muito longo").optional(),
  dataPrazo: z.string().min(1, "Data do prazo é obrigatória").optional(),
  descricao: z.string().max(2000, "Descrição muito longa").optional().nullable(),
});

/**
 * Schema de validação para Prazo completo (resposta da API)
 */
export const prazoSchema = z.object({
  id: z.string().uuid(),
  empresaId: z.string().uuid(),
  bidId: z.string().uuid(),
  titulo: z.string(),
  dataPrazo: z.string().datetime(),
  descricao: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Prazo = z.infer<typeof prazoSchema>;
export type CreatePrazoInput = z.infer<typeof createPrazoSchema>;
export type UpdatePrazoInput = z.infer<typeof updatePrazoSchema>;
