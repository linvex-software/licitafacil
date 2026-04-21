"use client";

import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Lock, Users, AlertTriangle } from "lucide-react";
import { useBilling } from "@/contexts/billing-context";
import { PLAN_DISPLAY_NAMES, PLANS_DATA } from "@/constants/plans";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FEATURE_DISPLAY_NAMES: Record<string, string> = {
  monitoramento: "Monitoramento de Pregões",
  ia_analise_edital: "Análise de Edital com IA",
  ia_chat_edital: "Chat com Edital",
  disputa_ao_vivo: "Painel de Lances ao Vivo",
  analytics_concorrencia: "Análise de Concorrência",
  modulo_juridico: "Módulo Jurídico",
};

function supportWhatsAppUrl(prefilled: string): string {
  const phone = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP_PHONE ?? "5582819990000";
  return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(prefilled)}`;
}

export function FeatureLockModal() {
  const { modalData, closeModal } = useBilling();
  const router = useRouter();

  return (
    <AnimatePresence>
      {modalData && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-label="Fechar"
            onClick={closeModal}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={cn(
              "relative z-10 w-full max-w-md rounded-xl border bg-zinc-900 p-6 shadow-xl",
              modalData.type === "FEATURE_LOCKED" && "border-zinc-800",
              modalData.type === "USER_LIMIT_EXCEEDED" && "border-zinc-800",
              modalData.type === "ACCOUNT_INACTIVE" && "border-zinc-800",
            )}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2 }}
          >
            {modalData.type === "FEATURE_LOCKED" && (
              <FeatureLockedBody
                data={modalData}
                onClose={closeModal}
                onVerPlanos={() => {
                  closeModal();
                  router.push("/planos");
                }}
              />
            )}
            {modalData.type === "USER_LIMIT_EXCEEDED" && (
              <UserLimitBody
                data={modalData}
                onClose={closeModal}
                onVerPlanos={() => {
                  closeModal();
                  router.push("/planos");
                }}
              />
            )}
            {modalData.type === "ACCOUNT_INACTIVE" && (
              <AccountInactiveBody data={modalData} onClose={closeModal} />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function FeatureLockedBody({
  data,
  onClose,
  onVerPlanos,
}: {
  data: { requiredPlan: string; feature: string };
  onClose: () => void;
  onVerPlanos: () => void;
}) {
  const planCommercial = PLAN_DISPLAY_NAMES[data.requiredPlan] ?? data.requiredPlan;
  const featureLabel = FEATURE_DISPLAY_NAMES[data.feature] ?? data.feature;
  const planRow = PLANS_DATA.find((p) => p.enum === data.requiredPlan);

  return (
    <>
      <div className="flex justify-center mb-4">
        <div className="rounded-full bg-white/10 p-3">
          <Lock className="h-7 w-7 text-white" aria-hidden />
        </div>
      </div>
      <h2 className="text-lg font-semibold text-center text-zinc-100">
        Recurso exclusivo do plano {planCommercial}
      </h2>
      <p className="mt-2 text-sm text-center text-zinc-400">
        Faça upgrade para desbloquear {featureLabel}.
      </p>
      {planRow && (
        <ul className="mt-5 space-y-2 border-t border-zinc-800 pt-4">
          {planRow.features.slice(0, 6).map((f) => (
            <li key={f} className="flex gap-2 text-sm text-zinc-300">
              <span className="shrink-0 text-white">✓</span>
              {f}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="ghost"
          className="text-zinc-400 hover:text-zinc-200"
          onClick={onClose}
        >
          Fechar
        </Button>
        <Button
          type="button"
          className="shadow-none"
          onClick={onVerPlanos}
        >
          Ver planos
        </Button>
      </div>
    </>
  );
}

function UserLimitBody({
  data,
  onClose,
  onVerPlanos,
}: {
  data: { maxAllowed: number; suggestedPlan: string };
  onClose: () => void;
  onVerPlanos: () => void;
}) {
  const suggestedName = PLAN_DISPLAY_NAMES[data.suggestedPlan] ?? data.suggestedPlan;

  return (
    <>
      <div className="flex justify-center mb-4">
        <div className="rounded-full bg-white/10 p-3">
          <Users className="h-7 w-7 text-white" aria-hidden />
        </div>
      </div>
      <h2 className="text-lg font-semibold text-center text-zinc-100">Limite de usuários atingido</h2>
      <p className="mt-2 text-sm text-center text-zinc-400">
        Seu plano permite até {data.maxAllowed} usuários. Faça upgrade para o plano {suggestedName}.
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="ghost"
          className="text-zinc-400 hover:text-zinc-200"
          onClick={onClose}
        >
          Fechar
        </Button>
        <Button
          type="button"
          className="shadow-none"
          onClick={onVerPlanos}
        >
          Ver planos
        </Button>
      </div>
    </>
  );
}

function AccountInactiveBody({
  data,
  onClose,
}: {
  data: { status: "SUSPENSO" | "CANCELADO" };
  onClose: () => void;
}) {
  const titulo = data.status === "CANCELADO" ? "Conta cancelada" : "Conta suspensa";

  return (
    <>
      <div className="flex justify-center mb-4">
        <div className="rounded-full bg-muted p-3">
          <AlertTriangle className="h-7 w-7 text-muted-foreground" aria-hidden />
        </div>
      </div>
      <h2 className="text-lg font-semibold text-center text-zinc-100">{titulo}</h2>
      <p className="mt-2 text-sm text-center text-zinc-400">
        Entre em contato com o suporte para reativar sua conta.
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="ghost"
          className="text-zinc-400 hover:text-zinc-200"
          onClick={onClose}
        >
          Fechar
        </Button>
        <Button
          type="button"
          className="shadow-none"
          onClick={() => {
            window.open(
              supportWhatsAppUrl("Olá, preciso de ajuda com o status da minha conta no LIMVEX LICITAÇÃO."),
              "_blank",
              "noopener,noreferrer",
            );
          }}
        >
          Falar com o suporte
        </Button>
      </div>
    </>
  );
}
