"use client";

import { type ReactNode } from "react";
import { hasFeatureAccess, PLAN_DISPLAY_NAMES, FEATURE_PLAN_MAP } from "@/constants/plans";
import { useAuth } from "@/contexts/auth-context";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  feature: string;
  children: ReactNode;
  /** Se true, esconde completamente em vez de desabilitar */
  hideIfLocked?: boolean;
}

export function CanAccessFeature({ feature, children, hideIfLocked }: Props) {
  const { userPlan } = useAuth();

  if (hasFeatureAccess(userPlan, feature)) {
    return <>{children}</>;
  }

  if (hideIfLocked) return null;

  const requiredPlan = FEATURE_PLAN_MAP[feature];
  const planName = requiredPlan ? PLAN_DISPLAY_NAMES[requiredPlan] ?? requiredPlan : "superior";

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <span className="inline-flex w-full max-w-full cursor-not-allowed rounded-lg">
          <span className="w-full opacity-50 pointer-events-none select-none">{children}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        align="start"
        className="max-w-[min(100vw-1rem,280px)] border-zinc-700 bg-zinc-800 text-zinc-200"
      >
        Disponível no plano {planName}
      </TooltipContent>
    </Tooltip>
  );
}
