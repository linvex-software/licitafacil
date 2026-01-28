"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/Card";
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
    setModalOpen(true);
  };

  const openEdit = (p: PrazoWithDays) => {
    setEditingId(p.id);
    setFormTitulo(p.titulo);
    setFormDataPrazo(toInputDateTime(p.dataPrazo));
    setFormDescricao(p.descricao ?? "");
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formTitulo.trim()) {
      toast({ title: "Título é obrigatório", variant: "destructive" });
      return;
    }
    if (!formDataPrazo.trim()) {
      toast({ title: "Data do prazo é obrigatória", variant: "destructive" });
      return;
    }
    // Enviar como ISO para o backend
    const dataPrazoIso = new Date(formDataPrazo).toISOString();

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
      setModalOpen(false);
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
      <Card className="shadow-sm border-slate-200">
        <CardContent className="py-16">
          <div className="flex flex-col items-center justify-center gap-3 text-slate-500">
            <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            <span>Carregando prazos...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-sm border-slate-200 border-red-200 bg-red-50/50">
        <CardContent className="py-12">
          <div className="text-center text-red-700 font-medium">{error}</div>
          <div className="text-center mt-4">
            <Button variant="outline" onClick={loadPrazos} className="border-red-200 hover:bg-red-50">
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
        <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 shadow-sm">
          <Plus className="w-4 h-4 mr-2" />
          Novo prazo
        </Button>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardContent className="pt-6">
          {prazos.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-100 text-slate-400 mb-4">
                <Calendar className="w-7 h-7" />
              </div>
              <p className="text-slate-600 font-medium mb-1">Nenhum prazo cadastrado</p>
              <p className="text-sm text-slate-500 mb-6">Clique em &quot;Novo prazo&quot; para adicionar datas importantes desta licitação.</p>
              <Button onClick={openCreate} variant="outline" className="border-emerald-500/50 text-emerald-700 hover:bg-emerald-50">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar primeiro prazo
              </Button>
            </div>
          ) : (
            <ul className="space-y-3">
              {prazos.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/50 hover:border-slate-300 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-heading font-medium text-slate-900">{p.titulo}</span>
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          (p.diasRestantes ?? 0) < 0
                            ? "bg-red-100 text-red-800"
                            : (p.diasRestantes ?? 0) === 0
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {formatDiasRestantes(p.diasRestantes)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 text-sm text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {formatDataPrazo(p.dataPrazo)}
                      </span>
                    </div>
                    {p.descricao && (
                      <p className="mt-2 text-sm text-slate-500">{p.descricao}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(p)}
                      aria-label="Editar prazo"
                      className="text-slate-500 hover:text-emerald-600 hover:bg-emerald-50"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(p.id)}
                      disabled={deletingId === p.id}
                      aria-label="Remover prazo"
                      className="text-slate-500 hover:text-red-600 hover:bg-red-50"
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

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {editingId ? "Editar prazo" : "Novo prazo"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="titulo" className="text-slate-700">Título</Label>
              <Input
                id="titulo"
                value={formTitulo}
                onChange={(e) => setFormTitulo(e.target.value)}
                placeholder="Ex: Entrega de propostas"
                className="border-slate-200 focus-visible:ring-emerald-500"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dataPrazo" className="text-slate-700">Data e hora</Label>
              <Input
                id="dataPrazo"
                type="datetime-local"
                value={formDataPrazo}
                onChange={(e) => setFormDataPrazo(e.target.value)}
                className="border-slate-200 focus-visible:ring-emerald-500"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="descricao" className="text-slate-700">Descrição (opcional)</Label>
              <Input
                id="descricao"
                value={formDescricao}
                onChange={(e) => setFormDescricao(e.target.value)}
                placeholder="Observações"
                className="border-slate-200 focus-visible:ring-emerald-500"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={submitting} className="border-slate-200">
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
