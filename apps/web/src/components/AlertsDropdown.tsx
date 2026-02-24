"use client";

import { useRouter } from "next/navigation";
import { Bell, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAlerts } from "@/hooks/use-alerts";
import type { Alert } from "@licitafacil/shared";

function alertHref(alert: Alert): string | null {
  if (alert.resourceType === "Bid" && alert.resourceId) {
    return `/licitacoes/${alert.resourceId}`;
  }
  if (alert.resourceType === "Prazo") {
    const bidId = (alert.metadata as { bidId?: string })?.bidId;
    return bidId ? `/licitacoes/${bidId}/prazos` : null;
  }
  if (alert.resourceType === "Document") {
    const bidId = (alert.metadata as { bidId?: string })?.bidId;
    return bidId ? `/licitacoes/${bidId}/documentos` : null;
  }
  if (alert.resourceType === "ChecklistItem") {
    const licitacaoId = (alert.metadata as { licitacaoId?: string })?.licitacaoId;
    return licitacaoId ? `/licitacoes/${licitacaoId}/checklist` : null;
  }
  return null;
}

function severityDot(severity: string) {
  if (severity === "CRITICAL") return "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]";
  if (severity === "WARNING") return "bg-amber-500";
  return "bg-blue-500";
}

export function AlertsDropdown() {
  const router = useRouter();
  const { alerts, unseenCount, loading, markSeen } = useAlerts();

  const handleAlertClick = (alert: Alert) => {
    if (alert.status === "UNSEEN") markSeen(alert.id);
    const href = alertHref(alert);
    if (href) router.push(href);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative hover:bg-gray-100 dark:hover:bg-gray-800 h-10 w-10">
          <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          {unseenCount > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-[10px] font-bold text-white rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900">
              {unseenCount > 99 ? "99+" : unseenCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Alertas da empresa</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {unseenCount > 0
              ? `${unseenCount} não ${unseenCount === 1 ? "lido" : "lidos"}`
              : loading
                ? "Carregando…"
                : "Tudo em dia"}
          </p>
        </div>
        <div className="max-h-[320px] overflow-y-auto">
          {loading ? (
            <div className="p-6 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400 dark:text-gray-500" />
            </div>
          ) : alerts.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Nenhum alerta no momento.
            </div>
          ) : (
            alerts.map((alert) => {
              const isUnseen = alert.status === "UNSEEN";
              return (
                <button
                  key={alert.id}
                  type="button"
                  onClick={() => handleAlertClick(alert)}
                  className="w-full flex items-start gap-3 py-3 px-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-50 dark:border-gray-800 last:border-0 text-left"
                >
                  <div
                    className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${severityDot(alert.severity ?? "INFO")}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-snug">{alert.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-snug line-clamp-2 mt-0.5">
                      {alert.message}
                    </p>
                  </div>
                  {isUnseen && (
                    <span
                      className="shrink-0 p-1 rounded text-gray-400 dark:text-gray-500"
                      title="Será marcado como lido ao abrir"
                    >
                      <Check className="w-4 h-4 opacity-50" />
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
