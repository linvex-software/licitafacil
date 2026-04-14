"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  adminGetCompanyBillingAudit,
  adminUpdateCompanyPlan,
  adminUpdateCompanyRenewalDate,
  adminUpdateCompanyStatus,
  type AdminClienteStatus,
  type AdminPlanoTipo,
} from "@/lib/api";
import { PLAN_DISPLAY_NAMES } from "@/constants/plans";
import { Infinity as InfinityIcon } from "lucide-react";
import { formatCNPJ } from "@/lib/utils";

interface BillingEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  companyName: string;
  cnpj: string;
  planoAtual: AdminPlanoTipo;
  statusAtual: AdminClienteStatus;
  maxUsuariosAtual: number;
  usuariosAtivos: number;
  dataProximaCobrancaAtual?: string | null;
  onSaved?: () => void;
}

function toDateInputValue(isoOrNull?: string | null) {
  if (!isoOrNull) return "";
  const d = new Date(isoOrNull);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}

function displayPlan(plano: string) {
  return PLAN_DISPLAY_NAMES[plano] ?? plano;
}

function displayAuditAction(action: string) {
  if (action === "billing.plan_changed") return "Plano alterado";
  if (action === "billing.status_changed") return "Status alterado";
  if (action === "billing.renewal_changed") return "Vencimento alterado";
  return action;
}

function renderMaxUsuarios(max: number) {
  if (max >= 999999) {
    return (
      <span className="inline-flex items-center justify-center gap-1 leading-none">
        <InfinityIcon className="h-4 w-4 relative top-[3px]" />
        <span className="sr-only">Ilimitado</span>
      </span>
    );
  }
  return <span>{max}</span>;
}

export function BillingEditModal({
  open,
  onOpenChange,
  companyId,
  companyName,
  cnpj,
  planoAtual,
  statusAtual,
  maxUsuariosAtual,
  usuariosAtivos,
  dataProximaCobrancaAtual,
  onSaved,
}: BillingEditModalProps) {
  const [saving, setSaving] = useState(false);
  const [plano, setPlano] = useState<AdminPlanoTipo>(planoAtual);
  const [status, setStatus] = useState<AdminClienteStatus>(statusAtual);
  const [vencimento, setVencimento] = useState<string>(toDateInputValue(dataProximaCobrancaAtual));
  const [audit, setAudit] = useState<Array<{ id: string; action: string; createdAt: string; user: { name: string; email: string } | null; metadata: unknown }>>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const mudou = useMemo(() => {
    return (
      plano !== planoAtual ||
      status !== statusAtual ||
      vencimento !== toDateInputValue(dataProximaCobrancaAtual)
    );
  }, [plano, planoAtual, status, statusAtual, vencimento, dataProximaCobrancaAtual]);

  useEffect(() => {
    if (!open) return;
    setPlano(planoAtual);
    setStatus(statusAtual);
    setVencimento(toDateInputValue(dataProximaCobrancaAtual));
  }, [open, planoAtual, statusAtual, dataProximaCobrancaAtual]);

  useEffect(() => {
    if (!open) return;
    setLoadingAudit(true);
    adminGetCompanyBillingAudit(companyId)
      .then((logs) => {
        setAudit(
          (logs ?? []).map((l) => ({
            id: l.id,
            action: l.action,
            createdAt: l.createdAt,
            user: l.user ? { name: l.user.name, email: l.user.email } : null,
            metadata: l.metadata,
          })),
        );
      })
      .catch(() => setAudit([]))
      .finally(() => setLoadingAudit(false));
  }, [open, companyId]);

  async function salvar() {
    if (!mudou) {
      onOpenChange(false);
      return;
    }
    setSaving(true);
    try {
      if (plano !== planoAtual) {
        await adminUpdateCompanyPlan(companyId, plano);
      }
      if (status !== statusAtual) {
        await adminUpdateCompanyStatus(companyId, status);
      }
      const vencimentoAtualStr = toDateInputValue(dataProximaCobrancaAtual);
      if (vencimento !== vencimentoAtualStr) {
        if (!vencimento) {
          toast({
            title: "Data inválida",
            description: "Informe uma data de vencimento válida.",
            variant: "destructive",
          });
          return;
        }
        // enviar como ISO completo para o backend
        const iso = new Date(`${vencimento}T00:00:00.000Z`).toISOString();
        await adminUpdateCompanyRenewalDate(companyId, iso);
      }

      toast({ title: "Billing atualizado", description: "As alterações foram aplicadas com sucesso." });
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Não foi possível salvar as alterações de billing.";
      toast({ title: "Erro", description: String(msg), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  const planoOptions: Array<{ value: AdminPlanoTipo; label: string }> = [
    { value: "STARTER", label: displayPlan("STARTER") },
    { value: "PROFESSIONAL", label: displayPlan("PROFESSIONAL") },
    { value: "ENTERPRISE", label: displayPlan("ENTERPRISE") },
  ];

  const statusOptions: Array<{ value: AdminClienteStatus; label: string }> = [
    { value: "ATIVO", label: "ATIVO" },
    { value: "TRIAL", label: "TRIAL" },
    { value: "SUSPENSO", label: "SUSPENSO" },
    { value: "CANCELADO", label: "CANCELADO" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Billing</DialogTitle>
          <DialogDescription>
            {companyName} • {formatCNPJ(cnpj)}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Plano</Label>
            <Select value={plano} onValueChange={(v) => setPlano(v as AdminPlanoTipo)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o plano" />
              </SelectTrigger>
              <SelectContent>
                {planoOptions.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Usuários: {usuariosAtivos}/{renderMaxUsuarios(maxUsuariosAtual)}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as AdminClienteStatus)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Data de vencimento</Label>
            <Input
              type="date"
              value={vencimento}
              onChange={(e) => setVencimento(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Controla o vencimento (próxima cobrança) da empresa.
            </p>
          </div>
        </div>

        <div className="mt-4 border-t pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Últimas mudanças</h3>
          </div>
          {loadingAudit ? (
            <p className="text-sm text-muted-foreground mt-2">Carregando histórico...</p>
          ) : audit.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-2">Sem alterações recentes de billing.</p>
          ) : (
            <div className="mt-2 space-y-2 text-sm">
              {audit.map((l) => (
                <div key={l.id} className="rounded-md border border-border p-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">{displayAuditAction(l.action)}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(l.createdAt).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {l.user ? `${l.user.name} (${l.user.email})` : "Sistema"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={saving || !mudou}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

