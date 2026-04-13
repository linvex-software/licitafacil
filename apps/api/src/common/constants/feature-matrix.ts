import { PlanoTipo } from "@prisma/client";

export type FeatureName =
  | "monitoramento"
  | "ia_analise_edital"
  | "ia_chat_edital"
  | "disputa_ao_vivo"
  | "analytics_concorrencia"
  | "modulo_juridico";

export const FEATURE_MATRIX: Record<FeatureName, PlanoTipo[]> = {
  monitoramento: [PlanoTipo.PROFESSIONAL, PlanoTipo.ENTERPRISE],
  ia_analise_edital: [PlanoTipo.PROFESSIONAL, PlanoTipo.ENTERPRISE],
  ia_chat_edital: [PlanoTipo.PROFESSIONAL, PlanoTipo.ENTERPRISE],
  disputa_ao_vivo: [PlanoTipo.PROFESSIONAL, PlanoTipo.ENTERPRISE],
  analytics_concorrencia: [PlanoTipo.ENTERPRISE],
  modulo_juridico: [PlanoTipo.ENTERPRISE],
};

export const USER_LIMITS: Record<PlanoTipo, number | null> = {
  [PlanoTipo.STARTER]: 2,
  [PlanoTipo.PROFESSIONAL]: 5,
  [PlanoTipo.ENTERPRISE]: null,
};

export const PLAN_HIERARCHY: PlanoTipo[] = [
  PlanoTipo.STARTER,
  PlanoTipo.PROFESSIONAL,
  PlanoTipo.ENTERPRISE,
];

export function getRequiredPlan(feature: FeatureName): PlanoTipo {
  const allowed = FEATURE_MATRIX[feature];
  for (const plan of PLAN_HIERARCHY) {
    if (allowed.includes(plan)) {
      return plan;
    }
  }
  return PlanoTipo.ENTERPRISE;
}
