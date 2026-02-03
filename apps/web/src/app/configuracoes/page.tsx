"use client";

import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchUsoPlano,
  fetchPlanos,
  updateEmpresaPlano,
  type UsoPlano,
  type Plano,
} from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { UserRole } from "@licitafacil/shared";
import { CreditCard, Loader2 } from "lucide-react";

export default function ConfiguracoesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uso, setUso] = useState<UsoPlano | null>(null);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<{
    planoId: string;
    usuariosExtrasContratados: number;
  }>({ planoId: "", usuariosExtrasContratados: 0 });

  const loadData = async () => {
    setLoading(true);
    try {
      const [usoData, planosData] = await Promise.all([
        fetchUsoPlano(),
        fetchPlanos(),
      ]);
      setUso(usoData);
      setPlanos(planosData);
      if (usoData && !form.planoId) {
        setForm((f) => ({
          ...f,
          planoId: usoData.plano.id,
          usuariosExtrasContratados: usoData.usuariosExtrasContratados,
        }));
      }
    } catch {
      toast({ title: "Erro ao carregar dados", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (uso && dialogOpen) {
      setForm({
        planoId: uso.plano.id,
        usuariosExtrasContratados: uso.usuariosExtrasContratados,
      });
    }
  }, [uso, dialogOpen]);

  const isAdmin = user?.role === UserRole.ADMIN;
  const planoEmpresa = planos.find((p) => p.tipo === "EMPRESA");
  const selectedPlano = planos.find((p) => p.id === form.planoId);
  const showUsuariosExtras =
    selectedPlano?.tipo === "EMPRESA" && !!planoEmpresa;

  const handleUpdatePlano = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await updateEmpresaPlano({
        planoId: form.planoId,
        usuariosExtrasContratados: showUsuariosExtras
          ? form.usuariosExtrasContratados
          : 0,
      });
      toast({ title: "Plano atualizado com sucesso" });
      setDialogOpen(false);
      loadData();
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string | string[] } } })
              .response?.data?.message
          : null;
      const text =
        typeof msg === "string"
          ? msg
          : Array.isArray(msg) && msg.length
            ? msg[0]
            : "Erro ao atualizar plano.";
      setFormError(text);
      toast({ title: text, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-slate-900 mb-2">
            Configurações
          </h1>
          <p className="text-slate-600">
            Gerencie o plano da sua empresa e preferências.
          </p>
        </div>

        {loading ? (
          <Card className="border-slate-200">
            <CardContent className="py-16">
              <div className="flex flex-col items-center justify-center gap-3 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span>Carregando...</span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Plano da empresa */}
            <Card className="border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-heading flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-slate-600" />
                  Plano da empresa
                </CardTitle>
                {isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFormError(null);
                      setDialogOpen(true);
                    }}
                  >
                    Alterar plano
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {uso ? (
                  <>
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <span className="text-sm text-slate-600">
                        Plano atual
                      </span>
                      <span className="font-medium text-slate-900">
                        {uso.plano.nome}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <span className="text-sm text-slate-600">
                        Usuários (ativo / limite)
                      </span>
                      <span className="font-medium text-slate-900">
                        {uso.usuariosAtivos} / {uso.limiteUsuarios}
                      </span>
                    </div>
                    {uso.plano.tipo === "EMPRESA" &&
                      uso.usuariosExtrasContratados > 0 && (
                        <div className="flex items-center justify-between py-2">
                          <span className="text-sm text-slate-600">
                            Usuários extras contratados
                          </span>
                          <span className="font-medium text-slate-900">
                            {uso.usuariosExtrasContratados}
                          </span>
                        </div>
                      )}
                  </>
                ) : (
                  <p className="text-sm text-slate-500">
                    Não foi possível carregar os dados do plano.
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Dialog Alterar plano */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Alterar plano</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdatePlano} className="space-y-4">
              {formError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
                  {formError}
                </div>
              )}
              <div>
                <Label>Plano</Label>
                <Select
                  value={form.planoId}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      planoId: v,
                      usuariosExtrasContratados:
                        planos.find((p) => p.id === v)?.tipo === "EMPRESA"
                          ? f.usuariosExtrasContratados
                          : 0,
                    }))
                  }
                  required
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione o plano" />
                  </SelectTrigger>
                  <SelectContent>
                    {planos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome} — até {p.maxUsuarios} usuário(s) — R${" "}
                        {Number(p.precoMensal).toFixed(2).replace(".", ",")}/mês
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {showUsuariosExtras && (
                <div>
                  <Label htmlFor="extras">
                    Usuários extras (além do limite base do plano)
                  </Label>
                  <Input
                    id="extras"
                    type="number"
                    min={0}
                    value={form.usuariosExtrasContratados}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        usuariosExtrasContratados: Math.max(
                          0,
                          parseInt(e.target.value, 10) || 0
                        ),
                      }))
                    }
                    className="mt-1"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Plano Empresa: limite = {selectedPlano?.maxUsuarios ?? 0} +
                    extras
                  </p>
                </div>
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
