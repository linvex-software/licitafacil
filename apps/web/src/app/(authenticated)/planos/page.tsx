"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { Layout } from "@/components/layout";
import { PLANS_DATA, PLAN_HIERARCHY, type PlanEnum } from "@/constants/plans";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import Link from "next/link";

function planComparison(
  userPlan: PlanEnum,
  cardPlan: PlanEnum,
): "current" | "below" | "above" {
  const ui = PLAN_HIERARCHY.indexOf(userPlan);
  const ci = PLAN_HIERARCHY.indexOf(cardPlan);
  if (ci === ui) return "current";
  if (ci < ui) return "below";
  return "above";
}

function openUpgradeWhatsApp(planDisplayName: string) {
  const phone = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP_PHONE ?? "5582819990000";
  window.open(
    `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(`Olá, tenho interesse no plano ${planDisplayName} do LIMVEX LICITAÇÃO`)}`,
    "_blank",
    "noopener,noreferrer",
  );
}

export default function PlanosPage() {
  const { userPlan } = useAuth();

  return (
    <AuthGuard>
      <Layout>
        <div className="mx-auto max-w-5xl space-y-10 px-1">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 md:text-3xl">
              Escolha seu plano
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Selecione o plano ideal para sua operação de licitações
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {PLANS_DATA.map((plan) => {
              const cmp = planComparison(userPlan, plan.enum);
              const isHighlight = plan.highlighted;

              return (
                <div
                  key={plan.enum}
                  className={cn(
                    "relative flex flex-col rounded-xl border bg-zinc-900 p-6",
                    isHighlight
                      ? "scale-[1.02] border-2 border-white shadow-lg shadow-black/40"
                      : "border-zinc-800",
                  )}
                >
                  {plan.badge ? (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-primary-foreground">
                      {plan.badge}
                    </span>
                  ) : null}
                  {cmp === "current" ? (
                    <span className="absolute -top-3 right-4 rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
                      Seu plano
                    </span>
                  ) : null}

                  <h2 className="text-xl font-bold text-zinc-100">{plan.name}</h2>
                  <p className="mt-0.5 text-xs text-zinc-500">{plan.subtitle}</p>

                  <div className="mt-6 border-t border-zinc-800 pt-6">
                    <p className="text-3xl font-bold text-zinc-100">
                      R$ {plan.priceAnnual},00
                      <span className="text-base font-normal text-zinc-400">/mês</span>
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      Plano anual · ou R$ {plan.priceMonthly},00/mês no semestral
                    </p>
                  </div>

                  <ul className="mt-6 flex-1 space-y-3">
                    {plan.features.map((f) => (
                      <li key={f} className="flex gap-2 text-sm text-zinc-300">
                        <Check className="h-4 w-4 shrink-0 text-white" aria-hidden />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-8">
                    {cmp === "current" ? (
                      <Button disabled className="w-full" variant="secondary">
                        Plano atual
                      </Button>
                    ) : null}
                    {cmp === "below" ? (
                      <Button
                        disabled
                        variant="outline"
                        className="w-full border-zinc-700 text-zinc-400"
                      >
                        Plano atual inclui
                      </Button>
                    ) : null}
                    {cmp === "above" ? (
                      <div className="space-y-2">
                        <Link href={`/checkout?plan=${plan.name.toLowerCase()}&cycle=annual`}>
                          <Button className="w-full shadow-none">
                            Assinar {plan.name}
                          </Button>
                        </Link>
                        <button
                          type="button"
                          className="w-full text-xs text-zinc-400 underline-offset-2 hover:text-zinc-200 hover:underline"
                          onClick={() => openUpgradeWhatsApp(plan.name)}
                        >
                          Ou falar com o suporte no WhatsApp
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Layout>
    </AuthGuard>
  );
}
