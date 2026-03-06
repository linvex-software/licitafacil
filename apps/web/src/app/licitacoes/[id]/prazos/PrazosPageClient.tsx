"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  fetchPrazosByBid,
  createPrazo,
  updatePrazo,
  deletePrazo,
} from "@/lib/api";
import type { Prazo } from "@licitafacil/shared";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Plus, Pencil, Trash2, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PrazoWithDays extends Prazo {
  diasRestantes: number | null;
}

interface PrazosPageClientProps {
  bidId: string;
}

function formatDiasRestantes(diasRestantes: number | null): string {
  if (diasRestantes === null) return "-";
  if (diasRestantes > 0) return `Faltam ${diasRestantes} dias`;
  if (diasRestantes < 0) return `Venceu há ${Math.abs(diasRestantes)} dias`;
  return "Hoje";
}

function formatDataPrazo(iso: string): string {
  try {
    return format(new Date(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return iso;
  }
}

/** Converte Date ou string para input datetime-local (YYYY-MM-DDTHH:mm) */
function toInputDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PrazosPageClient({ bidId }: PrazosPageClientProps) {
  const [prazos, setPrazos] = useState<PrazoWithDays[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitulo, setFormTitulo] = useState("");
  const [formDataPrazo, setFormDataPrazo] = useState("");
  const [formDescricao, setFormDescricao] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  const loadPrazos = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchPrazosByBid(bidId);
      setPrazos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar prazos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrazos();
  }, [bidId]);

  const openCreate = () => {
    setEditingId(null);
    setFormTitulo("");
    setFormDataPrazo("");
    setFormDescricao("");
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (p: PrazoWithDays) => {
    setEditingId(p.id);
    setFormTitulo(p.titulo);
    setFormDataPrazo(toInputDateTime(p.dataPrazo));
    setFormDescricao(p.descricao ?? "");
    setFormError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setFormTitulo("");
    setFormDataPrazo("");
    setFormDescricao("");
    setFormError(null);
  };

  const handleSubmit = async () => {
    setFormError(null);
    if (!formTitulo.trim()) {
      toast({ title: "Título é obrigatório", variant: "destructive" });
      return;
    }
    if (!formDataPrazo.trim()) {
      toast({ title: "Data do prazo é obrigatória", variant: "destructive" });
      setFormError("Data e hora são obrigatórias.");
      return;
    }
    const dataObj = new Date(formDataPrazo);
    if (Number.isNaN(dataObj.getTime())) {
      setFormError("Data e hora inválidas. Por favor, selecione uma data válida.");
      return;
    }

    const dataPrazoIso = dataObj.toISOString();

    setSubmitting(true);
    try {
      if (editingId) {
        await updatePrazo(editingId, {
          titulo: formTitulo.trim(),
          dataPrazo: dataPrazoIso,
          descricao: formDescricao.trim() || null,
        });
        toast({ title: "Prazo atualizado com sucesso" });
      } else {
        await createPrazo({
          bidId,
          titulo: formTitulo.trim(),
          dataPrazo: dataPrazoIso,
          descricao: formDescricao.trim() || null,
        });
        toast({ title: "Prazo criado com sucesso" });
      }
      closeModal();
      loadPrazos();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remover este prazo?")) return;
    setDeletingId(id);
    try {
      await deletePrazo(id);
      toast({ title: "Prazo removido" });
      loadPrazos();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao remover";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <Card className="shadow-sm border-gray-200 dark:border-gray-700">
        <CardContent className="py-16">
          <div className="flex flex-col items-center justify-center gap-3 text-gray-500 dark:text-gray-400">
            <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            <span>Carregando prazos...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-sm border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/50">
        <CardContent className="py-12">
          <div className="text-center text-red-700 dark:text-red-400 font-medium">{error}</div>
          <div className="text-center mt-4">
            <Button variant="outline" onClick={loadPrazos} className="border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950">
              Tentar novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="flex justify-end mb-6">
        <Button onClick={openCreate} className="bg-[#0078D1] hover:bg-[#0062ab] text-white shadow-sm">
          <Plus className="w-4 h-4 mr-2" />
          Novo prazo
        </Button>
      </div>

      <Card className="shadow-sm border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
        <CardContent className="pt-6">
          {prazos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="mb-3 rounded-full bg-gray-100 dark:bg-gray-800 p-3">
                <Calendar className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Nenhum prazo cadastrado
              </p>
              <p className="mt-1 max-w-xs text-xs text-gray-400 dark:text-gray-500">
                O edital não informou prazos automaticamente. Adicione manualmente as datas importantes.
              </p>
              <Button
                onClick={openCreate}
                variant="outline"
                className="mt-4 border-[#0078D1] text-[#0078D1] dark:border-[#60a5fa] dark:text-[#60a5fa] hover:bg-[#0078D1]/5 dark:hover:bg-[#60a5fa]/10"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar primeiro prazo
              </Button>
            </div>
          ) : (
            <ul className="space-y-3">
              {prazos.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-heading font-medium text-gray-900 dark:text-gray-100">{p.titulo}</span>
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full ${(p.diasRestantes ?? 0) < 0
                            ? "bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-400"
                            : (p.diasRestantes ?? 0) === 0
                              ? "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-400"
                              : "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400"
                          }`}
                      >
                        {formatDiasRestantes(p.diasRestantes)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                        {formatDataPrazo(p.dataPrazo)}
                      </span>
                    </div>
                    {p.descricao && (
                      <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{p.descricao}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(p)}
                      aria-label="Editar prazo"
                      className="text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(p.id)}
                      disabled={deletingId === p.id}
                      aria-label="Remover prazo"
                      className="text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={modalOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeModal();
            return;
          }
          setModalOpen(true);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {editingId ? "Editar prazo" : "Novo prazo"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="titulo" className="text-gray-700 dark:text-gray-300">Título</Label>
              <Input
                id="titulo"
                value={formTitulo}
                onChange={(e) => setFormTitulo(e.target.value)}
                placeholder="Ex: Entrega de propostas"
                className="border-gray-200 dark:border-gray-700"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dataPrazo" className="text-gray-700 dark:text-gray-300">Data e hora</Label>
              <Input
                id="dataPrazo"
                type="datetime-local"
                value={formDataPrazo}
                onChange={(e) => setFormDataPrazo(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-[#0078D1]/50 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              />
              {formError && (
                <p className="text-xs text-red-600 dark:text-red-400">{formError}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="descricao" className="text-gray-700 dark:text-gray-300">Descrição (opcional)</Label>
              <Textarea
                id="descricao"
                value={formDescricao}
                onChange={(e) => setFormDescricao(e.target.value)}
                placeholder="Observações"
                className="min-h-[92px] border-gray-200 text-sm dark:border-gray-700"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={closeModal} disabled={submitting} className="border-gray-200 dark:border-gray-700">
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
              {editingId ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
