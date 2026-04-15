import { PlanoTipo } from "@prisma/client";

export const CHECKOUT_PLANS = {
  start: {
    name: "Start",
    displayName: "START",
    enum: PlanoTipo.STARTER,
    prices: {
      semiannual: { monthly: 499, total: 2994, months: 6 },
      annual: { monthly: 349, total: 4188, months: 12 },
    },
  },
  growth: {
    name: "Growth",
    displayName: "GROWTH",
    enum: PlanoTipo.PROFESSIONAL,
    prices: {
      semiannual: { monthly: 799, total: 4794, months: 6 },
      annual: { monthly: 599, total: 7188, months: 12 },
    },
  },
  scale: {
    name: "Scale",
    displayName: "SCALE",
    enum: PlanoTipo.ENTERPRISE,
    prices: {
      semiannual: { monthly: 1299, total: 7794, months: 6 },
      annual: { monthly: 999, total: 11988, months: 12 },
    },
  },
} as const;

export type CheckoutPlanKey = keyof typeof CHECKOUT_PLANS;
export type CheckoutCycle = "semiannual" | "annual";
