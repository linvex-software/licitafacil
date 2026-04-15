import { Suspense } from "react";
import { CheckoutClient } from "./checkout-client";

type PlanKey = "start" | "growth" | "scale";
type CycleKey = "semiannual" | "annual";

interface CheckoutPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const params = searchParams ? await searchParams : {};
  const queryPlan = Array.isArray(params.plan) ? params.plan[0] : params.plan;
  const queryCycle = Array.isArray(params.cycle) ? params.cycle[0] : params.cycle;

  const initialPlan: PlanKey = queryPlan === "start" || queryPlan === "growth" || queryPlan === "scale"
    ? queryPlan
    : "growth";
  const initialCycle: CycleKey = queryCycle === "semiannual" || queryCycle === "annual"
    ? queryCycle
    : "annual";

  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#000000] text-white">
          <div className="size-10 animate-spin rounded-full border-2 border-[#666666] border-t-white" aria-hidden />
        </main>
      }
    >
      <CheckoutClient initialPlan={initialPlan} initialCycle={initialCycle} />
    </Suspense>
  );
}
