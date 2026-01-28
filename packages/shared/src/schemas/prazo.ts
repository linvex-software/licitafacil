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
 * Motivos de criticidade de um prazo.
 * Nota: criticalReason retorna apenas o motivo principal (por prioridade).
 * TODO: Adicionar criticalReasons[] para suportar múltiplas razões sem perda de informação.
 */
export const CriticalReason = {
  EXPIRED: "EXPIRED", // Prazo já vencido (data civil UTC < hoje UTC)
  EXPIRING_SOON: "EXPIRING_SOON", // Prazo próximo do vencimento (dentro do threshold configurável)
  CRITICAL_CHECKLIST_PENDING: "CRITICAL_CHECKLIST_PENDING", // Item de checklist crítico (isCritical) ainda não concluído
  MISSING_REQUIRED_DOCUMENT: "MISSING_REQUIRED_DOCUMENT", // Proxy: exigeEvidencia=true sem evidenciaId (documento obrigatório não entregue)
} as const;

/**
 * Schema de validação para Prazo completo (resposta da API)
 *
 * NOTA: dataPrazo é DateTime (tem hora), mas a lógica de criticidade compara apenas
 * a DATA CIVIL em UTC (ignora hora). Um prazo "2025-01-28 23:59:59" é tratado como
 * "2025-01-28" para cálculo de dias restantes.
 */
export const prazoSchema = z.object({
  id: z.string().uuid(),
  empresaId: z.string().uuid(),
  bidId: z.string().uuid(),
  titulo: z.string(),
  dataPrazo: z.string().datetime(), // DateTime (tem hora), mas comparação usa apenas data civil UTC
  descricao: z.string().nullable(),
  isCritical: z.boolean(), // Indica se o prazo é crítico
  criticalReason: z
    .enum([
      CriticalReason.EXPIRED,
      CriticalReason.EXPIRING_SOON,
      CriticalReason.CRITICAL_CHECKLIST_PENDING,
      CriticalReason.MISSING_REQUIRED_DOCUMENT,
    ])
    .nullable(), // Motivo principal da criticidade (null se não for crítico). Retorna apenas a primeira razão por prioridade.
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Prazo = z.infer<typeof prazoSchema>;
export type CreatePrazoInput = z.infer<typeof createPrazoSchema>;
export type UpdatePrazoInput = z.infer<typeof updatePrazoSchema>;
export type CriticalReasonType = keyof typeof CriticalReason;
