"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { PlanEnum } from "@/constants/plans";
import { registerBillingErrorHandler, unregisterBillingErrorHandler } from "@/lib/api";

interface FeatureLockData {
  type: "FEATURE_LOCKED";
  currentPlan: PlanEnum;
  requiredPlan: PlanEnum;
  feature: string;
}

interface UserLimitData {
  type: "USER_LIMIT_EXCEEDED";
  currentCount: number;
  maxAllowed: number;
  suggestedPlan: PlanEnum;
}

interface AccountInactiveData {
  type: "ACCOUNT_INACTIVE";
  status: "SUSPENSO" | "CANCELADO";
}

type BillingModalData = FeatureLockData | UserLimitData | AccountInactiveData | null;

interface BillingContextType {
  modalData: BillingModalData;
  showFeatureLock: (data: Omit<FeatureLockData, "type">) => void;
  showUserLimit: (data: Omit<UserLimitData, "type">) => void;
  showAccountInactive: (data: Omit<AccountInactiveData, "type">) => void;
  closeModal: () => void;
}

const BillingContext = createContext<BillingContextType | null>(null);

export function BillingProvider({ children }: { children: ReactNode }) {
  const [modalData, setModalData] = useState<BillingModalData>(null);

  const showFeatureLock = useCallback((data: Omit<FeatureLockData, "type">) => {
    setModalData({ type: "FEATURE_LOCKED", ...data });
  }, []);

  const showUserLimit = useCallback((data: Omit<UserLimitData, "type">) => {
    setModalData({ type: "USER_LIMIT_EXCEEDED", ...data });
  }, []);

  const showAccountInactive = useCallback((data: Omit<AccountInactiveData, "type">) => {
    setModalData({ type: "ACCOUNT_INACTIVE", ...data });
  }, []);

  const closeModal = useCallback(() => setModalData(null), []);

  useEffect(() => {
    registerBillingErrorHandler((data) => {
      if (data.code === "FEATURE_LOCKED") {
        showFeatureLock({
          currentPlan: data.currentPlan as PlanEnum,
          requiredPlan: data.requiredPlan as PlanEnum,
          feature: data.feature!,
        });
      } else if (data.code === "USER_LIMIT_EXCEEDED") {
        showUserLimit({
          currentCount: data.currentCount!,
          maxAllowed: data.maxAllowed!,
          suggestedPlan: data.suggestedPlan as PlanEnum,
        });
      } else if (data.code === "ACCOUNT_INACTIVE") {
        showAccountInactive({ status: data.status as "SUSPENSO" | "CANCELADO" });
      }
    });
    return () => unregisterBillingErrorHandler();
  }, [showFeatureLock, showUserLimit, showAccountInactive]);

  return (
    <BillingContext.Provider
      value={{ modalData, showFeatureLock, showUserLimit, showAccountInactive, closeModal }}
    >
      {children}
    </BillingContext.Provider>
  );
}

export function useBilling() {
  const ctx = useContext(BillingContext);
  if (!ctx) throw new Error("useBilling must be used within BillingProvider");
  return ctx;
}
