// Mapeamento enum Prisma → nome comercial
export const PLAN_DISPLAY_NAMES: Record<string, string> = {
  STARTER: "Start",
  PROFESSIONAL: "Growth",
  ENTERPRISE: "Scale",
};

// Hierarquia de planos (index = nível)
export const PLAN_HIERARCHY = ["STARTER", "PROFESSIONAL", "ENTERPRISE"] as const;
export type PlanEnum = (typeof PLAN_HIERARCHY)[number];

// Feature → plano mínimo requerido
export const FEATURE_PLAN_MAP: Record<string, PlanEnum> = {
  monitoramento: "PROFESSIONAL",
  ia_analise_edital: "PROFESSIONAL",
  ia_chat_edital: "PROFESSIONAL",
  disputa_ao_vivo: "PROFESSIONAL",
  analytics_concorrencia: "ENTERPRISE",
  modulo_juridico: "ENTERPRISE",
};

// Checa se plano X tem acesso à feature
export function hasFeatureAccess(userPlan: string, feature: string): boolean {
  const required = FEATURE_PLAN_MAP[feature];
  if (!required) return true;
  const userIndex = PLAN_HIERARCHY.indexOf(userPlan as PlanEnum);
  const requiredIndex = PLAN_HIERARCHY.indexOf(required);
  if (userIndex < 0 || requiredIndex < 0) return false;
  return userIndex >= requiredIndex;
}

export interface PlanCardData {
  enum: PlanEnum;
  name: string;
  subtitle: string;
  priceMonthly: number;
  priceAnnual: number;
  features: string[];
  highlighted: boolean;
  badge?: string;
}

// Dados dos planos para página /planos e modal
export const PLANS_DATA: PlanCardData[] = [
  {
    enum: "STARTER",
    name: "Start",
    subtitle: "Performance",
    priceMonthly: 499,
    priceAnnual: 349,
    features: [
      "Até 2 usuários",
      "Gestão de licitações",
      "Controle de prazos",
      "Checklist de documentos",
      "Funil Kanban",
      "Agenda integrada",
    ],
    highlighted: false,
  },
  {
    enum: "PROFESSIONAL",
    name: "Growth",
    subtitle: "Performance",
    priceMonthly: 799,
    priceAnnual: 599,
    features: [
      "Tudo do Start +",
      "Até 5 usuários",
      "Monitoramento automático",
      "Alertas de pregões",
      "Integração com portais",
      "Análise de edital com IA",
      "Chat com edital",
      "Painel de lances ao vivo",
    ],
    highlighted: true,
    badge: "Popular",
  },
  {
    enum: "ENTERPRISE",
    name: "Scale",
    subtitle: "Performance",
    priceMonthly: 1299,
    priceAnnual: 999,
    features: [
      "Tudo do Growth +",
      "Usuários ilimitados",
      "Operação multiempresa",
      "Analytics completo",
      "Análise de concorrência",
      "Calculadora de lance",
      "Geração automática de petições",
      "Templates jurídicos completos",
    ],
    highlighted: false,
  },
];
