import { z } from "zod";

/**
 * Schema de validação para Tenant (Inquilino/Cliente)
 */
export const tenantSchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string().min(1, "Nome do tenant é obrigatório"),
  createdAt: z.string().datetime(),
});

export type Tenant = z.infer<typeof tenantSchema>;

