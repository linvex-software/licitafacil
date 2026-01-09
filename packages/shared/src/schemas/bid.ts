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
} as const;

/**
 * Schema de validação para Licitação (Bid)
 */
export const bidSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  title: z.string().min(1, "Título é obrigatório"),
  agency: z.string().min(1, "Órgão é obrigatório"),
  modality: z.enum([
    BidModality.PREGAO_ELETRONICO,
    BidModality.CONCORRENCIA,
    BidModality.DISPENSA,
    BidModality.OUTRA,
  ]),
  legalStatus: z.enum([
    LegalStatus.ANALISANDO,
    LegalStatus.PARTICIPANDO,
    LegalStatus.DESCARTADA,
    LegalStatus.VENCIDA,
    LegalStatus.PERDIDA,
    LegalStatus.CANCELADA,
  ]),
  operationalState: z.enum([OperationalState.OK, OperationalState.EM_RISCO]),
  createdAt: z.string().datetime(),
});

export type Bid = z.infer<typeof bidSchema>;
export type BidModalityType = keyof typeof BidModality;
export type LegalStatusType = keyof typeof LegalStatus;
export type OperationalStateType = keyof typeof OperationalState;

