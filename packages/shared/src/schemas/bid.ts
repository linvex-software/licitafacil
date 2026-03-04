import { z } from "zod";

/**
 * Modalidades de licitação conforme legislação brasileira
 */
export const BidModality = {
  PREGAO_ELETRONICO: "PREGAO_ELETRONICO",
  CONCORRENCIA: "CONCORRENCIA",
  DISPENSA: "DISPENSA",
  OUTRA: "OUTRA",
} as const;

/**
 * Status jurídico da licitação
 */
export const LegalStatus = {
  ANALISANDO: "ANALISANDO",
  PARTICIPANDO: "PARTICIPANDO",
  AGUARDANDO_RESULTADO: "AGUARDANDO_RESULTADO",
  DESCARTADA: "DESCARTADA",
  VENCIDA: "VENCIDA",
  PERDIDA: "PERDIDA",
  CANCELADA: "CANCELADA",
} as const;

/**
 * Estado operacional da licitação
 */
export const OperationalState = {
  OK: "OK",
  EM_RISCO: "EM_RISCO",
  SUSPENSA: "SUSPENSA",
} as const;

/**
 * Schema de validação para criar uma licitação
 */
export const createBidSchema = z.object({
  title: z.string().min(1, "Título é obrigatório").max(500, "Título muito longo"),
  agency: z.string().min(1, "Órgão é obrigatório").max(200, "Nome do órgão muito longo"),
  modality: z.enum([
    BidModality.PREGAO_ELETRONICO,
    BidModality.CONCORRENCIA,
    BidModality.DISPENSA,
    BidModality.OUTRA,
  ]),
  legalStatus: z.enum([
    LegalStatus.ANALISANDO,
    LegalStatus.PARTICIPANDO,
    LegalStatus.AGUARDANDO_RESULTADO,
    LegalStatus.DESCARTADA,
    LegalStatus.VENCIDA,
    LegalStatus.PERDIDA,
    LegalStatus.CANCELADA,
  ]),
  operationalState: z.enum([OperationalState.OK, OperationalState.EM_RISCO, OperationalState.SUSPENSA]),
});

/**
 * Schema de validação para atualizar uma licitação
 */
export const updateBidSchema = z.object({
  title: z.string().min(1, "Título é obrigatório").max(500, "Título muito longo").optional(),
  agency: z.string().min(1, "Órgão é obrigatório").max(200, "Nome do órgão muito longo").optional(),
  modality: z
    .enum([
      BidModality.PREGAO_ELETRONICO,
      BidModality.CONCORRENCIA,
      BidModality.DISPENSA,
      BidModality.OUTRA,
    ])
    .optional(),
  legalStatus: z
    .enum([
      LegalStatus.ANALISANDO,
      LegalStatus.PARTICIPANDO,
      LegalStatus.AGUARDANDO_RESULTADO,
      LegalStatus.DESCARTADA,
      LegalStatus.VENCIDA,
      LegalStatus.PERDIDA,
      LegalStatus.CANCELADA,
    ])
    .optional(),
  operationalState: z.enum([OperationalState.OK, OperationalState.EM_RISCO, OperationalState.SUSPENSA]).optional(),
});

/**
 * Schema de validação para marcar licitação como em risco (confirmação consciente)
 */
export const markBidAtRiskSchema = z.object({
  confirmacao: z.literal("CONFIRMO_MARCAR_EM_RISCO"),
  motivo: z.string().min(10, "Motivo deve ter pelo menos 10 caracteres").max(500, "Motivo muito longo"),
});

/**
 * Schema de validação para remover risco de licitação (confirmação consciente)
 */
export const clearBidRiskSchema = z.object({
  confirmacao: z.literal("CONFIRMO_REMOVER_RISCO"),
});

/**
 * Schema de validação para mover uma licitação no funil Kanban
 */
export const moverColunaBidSchema = z.object({
  coluna: z.enum([
    LegalStatus.ANALISANDO,
    LegalStatus.PARTICIPANDO,
    LegalStatus.AGUARDANDO_RESULTADO,
    LegalStatus.DESCARTADA,
    LegalStatus.VENCIDA,
    LegalStatus.PERDIDA,
    LegalStatus.CANCELADA,
  ]),
});

/**
 * Schema de validação para Licitação (Bid) completa
 */
export const bidSchema = z.object({
  id: z.string().uuid(),
  empresaId: z.string().uuid(),
  title: z.string(),
  agency: z.string(),
  modality: z.string(),
  legalStatus: z.string(),
  operationalState: z.string(),
  janelaIntencaoRecursoTermino: z.string().datetime().nullable(),
  isVencedorProvisorio: z.boolean(),
  statusEsclarecimento: z.string(),
  dataAdjudicacao: z.string().datetime().nullable(),
  dataHomologacao: z.string().datetime().nullable(),
  riskReason: z.string().nullable(),
  lastRiskAnalysisAt: z.string().datetime().nullable(),
  manualRiskOverride: z.boolean(),
  manualRiskOverrideBy: z.string().uuid().nullable(),
  manualRiskOverrideAt: z.string().datetime().nullable(),
  hasEditalAnalysis: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Bid = z.infer<typeof bidSchema>;
export type CreateBidInput = z.infer<typeof createBidSchema>;
export type UpdateBidInput = z.infer<typeof updateBidSchema>;
export type MarkBidAtRiskInput = z.infer<typeof markBidAtRiskSchema>;
export type ClearBidRiskInput = z.infer<typeof clearBidRiskSchema>;
export type MoverColunaBidInput = z.infer<typeof moverColunaBidSchema>;
export type BidModalityType = keyof typeof BidModality;
export type LegalStatusType = keyof typeof LegalStatus;
export type OperationalStateType = keyof typeof OperationalState;

