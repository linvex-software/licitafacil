import { z } from "zod";
import { TipoPlano } from "../enums/tipo-plano.enum";

/**
 * Schema para criação de Plano (admin / seed)
 */
export const createPlanoSchema = z.object({
  nome: z.string().min(1, "Nome do plano é obrigatório").max(100, "Nome muito longo"),
  tipo: z.nativeEnum(TipoPlano),
  maxEmpresas: z.number().int().min(1, "Mínimo 1 empresa"),
  maxUsuarios: z.number().int().min(1, "Mínimo 1 usuário"),
  precoMensal: z.number().min(0, "Preço não pode ser negativo"),
  ativo: z.boolean().optional().default(true),
});

/**
 * Schema completo de Plano (resposta da API)
 */
export const planoSchema = z.object({
  id: z.string().uuid(),
  nome: z.string(),
  tipo: z.nativeEnum(TipoPlano),
  maxEmpresas: z.number().int(),
  maxUsuarios: z.number().int(),
  precoMensal: z.number(),
  ativo: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Schema para atualização parcial de Plano (ex.: ativo, precoMensal)
 */
export const updatePlanoSchema = createPlanoSchema.partial();

export type CreatePlanoInput = z.infer<typeof createPlanoSchema>;
export type UpdatePlanoInput = z.infer<typeof updatePlanoSchema>;
export type Plano = z.infer<typeof planoSchema>;
