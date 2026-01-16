import { z } from "zod";

/**
 * Schema para criação de Empresa (dados de entrada)
 */
export const createEmpresaSchema = z.object({
  name: z.string().min(1, "Nome da empresa é obrigatório").max(255, "Nome muito longo"),
});

/**
 * Schema completo de Empresa (resposta da API)
 */
export const empresaSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type CreateEmpresaInput = z.infer<typeof createEmpresaSchema>;
export type Empresa = z.infer<typeof empresaSchema>;
