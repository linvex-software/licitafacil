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
      <Card className="border-border shadow-sm">
        <CardContent className="py-16">
          <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
            <span>Carregando prazos...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/40 bg-destructive/5 shadow-sm">
        <CardContent className="py-12">
          <div className="text-center font-medium text-destructive">{error}</div>
          <div className="mt-4 text-center">
            <Button variant="outline" onClick={loadPrazos} className="border-destructive/30 hover:bg-destructive/10">
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
        <Button onClick={openCreate} className="shadow-none">
          <Plus className="w-4 h-4 mr-2" />
          Novo prazo
        </Button>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardContent className="pt-6">
          {prazos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="mb-3 rounded-full bg-muted p-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">
                Nenhum prazo cadastrado
              </p>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                O edital não informou prazos automaticamente. Adicione manualmente as datas importantes.
              </p>
              <Button
                onClick={openCreate}
                variant="outline"
                className="mt-4"
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
                  className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-border hover:bg-accent/40 sm:flex-row sm:items-center"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-heading font-medium text-foreground">{p.titulo}</span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${(p.diasRestantes ?? 0) < 0
                            ? "bg-destructive/10 text-destructive"
                            : (p.diasRestantes ?? 0) === 0
                              ? "bg-muted text-foreground"
                              : "bg-muted text-muted-foreground"
                          }`}
                      >
                        {formatDiasRestantes(p.diasRestantes)}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        {formatDataPrazo(p.dataPrazo)}
                      </span>
                    </div>
                    {p.descricao && (
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.descricao}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(p)}
                      aria-label="Editar prazo"
                      className="text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(p.id)}
                      disabled={deletingId === p.id}
                      aria-label="Remover prazo"
                      className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
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
              <Label htmlFor="titulo">Título</Label>
              <Input
                id="titulo"
                value={formTitulo}
                onChange={(e) => setFormTitulo(e.target.value)}
                placeholder="Ex: Entrega de propostas"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dataPrazo">Data e hora</Label>
              <Input
                id="dataPrazo"
                type="datetime-local"
                value={formDataPrazo}
                onChange={(e) => setFormDataPrazo(e.target.value)}
              />
              {formError && (
                <p className="text-xs text-destructive">{formError}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="descricao">Descrição (opcional)</Label>
              <Textarea
                id="descricao"
                value={formDescricao}
                onChange={(e) => setFormDescricao(e.target.value)}
                placeholder="Observações"
                className="min-h-[92px]"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={closeModal} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className="shadow-none dark:hover:bg-[#e0e0e0]">
              {editingId ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
