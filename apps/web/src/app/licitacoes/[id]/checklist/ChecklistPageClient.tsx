"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import {
  fetchChecklistItems,
  markChecklistItemCompleted,
  markChecklistItemIncomplete,
  gerarChecklistAnalise,
  updateChecklistItem,
  deleteChecklistItem,
} from "@/lib/api";
import type { LicitacaoChecklistItem } from "@licitafacil/shared";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Circle, AlertCircle, ListChecks, Plus, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ChecklistPageClientProps {
  licitacaoId: string;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

export function ChecklistPageClient({ licitacaoId }: ChecklistPageClientProps) {
  const [items, setItems] = useState<LicitacaoChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  // States do Modal de Criar / Editar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const [newItemData, setNewItemData] = useState({
    titulo: "",
    descricao: "",
    exigeEvidencia: false,
  });

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { toast } = useToast();

  const loadItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchChecklistItems(licitacaoId);
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar checklist");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [licitacaoId]);

  const handleToggleItem = async (item: LicitacaoChecklistItem) => {
    if (updatingIds.has(item.id)) return;

    try {
      setUpdatingIds((prev) => new Set(prev).add(item.id));

      if (item.concluido) {
        await markChecklistItemIncomplete(item.id);
        toast({ title: "Item desmarcado" });
      } else {
        if (item.exigeEvidencia && !item.evidenciaId) {
          toast({
            title: "Evidência necessária",
            description: "Vincule um documento a este item antes de marcar como concluído.",
            variant: "destructive",
          });
          setUpdatingIds((prev) => {
            const next = new Set(prev);
            next.delete(item.id);
            return next;
          });
          return;
        }
        await markChecklistItemCompleted(item.id, item.evidenciaId);
        toast({ title: "Item concluído" });
      }

      setError(null);
      await loadItems();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao atualizar item";
      setError(errorMessage);
      toast({ title: "Erro", description: errorMessage, variant: "destructive" });
      await loadItems();
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  const handleGerarIA = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      await gerarChecklistAnalise(licitacaoId);
      toast({ title: "Checklist importado com sucesso!" });
      await loadItems();
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || "Erro ao importar checklist";
      setError(errorMessage);
      toast({ title: "Aviso", description: errorMessage, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOpenModal = () => {
    setIsEditing(false);
    setEditingItemId(null);
    setNewItemData({ titulo: "", descricao: "", exigeEvidencia: false });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: LicitacaoChecklistItem) => {
    setIsEditing(true);
    setEditingItemId(item.id);
    setNewItemData({
      titulo: item.titulo,
      descricao: item.descricao || "",
      exigeEvidencia: item.exigeEvidencia,
    });
    setIsModalOpen(true);
  };

  const confirmDelete = (item: LicitacaoChecklistItem) => {
    setDeletingItemId(item.id);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteItem = async () => {
    if (!deletingItemId) return;
    try {
      setIsDeleting(true);
      await deleteChecklistItem(deletingItemId);
      toast({ title: "Item excluído com sucesso!" });
      setIsDeleteDialogOpen(false);
      setDeletingItemId(null);
      await loadItems();
    } catch (err) {
      toast({ title: "Erro", description: "Não foi possível excluir o item", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateOrUpdateItem = async () => {
    if (!newItemData.titulo.trim()) {
      toast({ title: "Erro", description: "O título do item é obrigatório", variant: "destructive" });
      return;
    }

    try {
      setIsCreating(true);

      if (isEditing && editingItemId) {
        await updateChecklistItem(editingItemId, {
          titulo: newItemData.titulo.trim(),
          descricao: newItemData.descricao.trim() || undefined,
          exigeEvidencia: newItemData.exigeEvidencia,
        });
        toast({ title: "Item atualizado com sucesso!" });
      } else {
        const { api } = await import("@/lib/api");
        await api.post("/checklist-items", {
          licitacaoId,
          titulo: newItemData.titulo.trim(),
          descricao: newItemData.descricao.trim() || undefined,
          exigeEvidencia: newItemData.exigeEvidencia,
        });
        toast({ title: "Item adicionado com sucesso!" });
      }

      setIsModalOpen(false);
      await loadItems();
    } catch (err) {
      toast({ title: "Erro", description: isEditing ? "Não foi possível atualizar o item" : "Não foi possível adicionar o item", variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) {
    return (
      <Card className="shadow-sm border-gray-200 dark:border-gray-700">
        <CardContent className="py-16">
          <div className="flex flex-col items-center justify-center gap-3 text-gray-500 dark:text-gray-400">
            <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            <span>Carregando checklist...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && items.length === 0) {
    return (
      <Card className="shadow-sm border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/50">
        <CardContent className="py-12">
          <div className="text-center">
            <p className="text-red-700 dark:text-red-400 font-medium mb-4">{error}</p>
            <Button variant="outline" onClick={loadItems} className="border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950">
              Tentar novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const completedCount = items.filter((item) => item.concluido).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Resumo */}
      <Card className="shadow-sm border-gray-200 dark:border-gray-700">
        <CardContent className="py-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <ListChecks className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Progresso do checklist</p>
                <p className="text-xl font-heading font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                  {completedCount} de {totalCount} itens concluídos
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-heading font-bold text-emerald-600 dark:text-emerald-400">{progress}%</p>
            </div>
          </div>
          <div className="mt-4 w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Ações / Botões */}
      <div className="flex justify-end mb-4 gap-3">
        <Button
          variant="outline"
          onClick={handleOpenModal}
          className="gap-2 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
        >
          <Plus className="w-4 h-4" />
          Adicionar Item
        </Button>
        <Button
          variant="outline"
          onClick={handleGerarIA}
          disabled={isGenerating}
          className="gap-2 border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-950/50"
        >
          {isGenerating ? (
            <div className="w-4 h-4 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          ) : (
            <span className="text-lg leading-none">✨</span>
          )}
          Gerar a partir da Análise IA
        </Button>
      </div>

      {/* Lista de itens */}
      {items.length === 0 ? (
        <Card className="shadow-sm border-gray-200 dark:border-gray-700">
          <CardContent className="py-16 px-4">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 mb-4">
                <ListChecks className="w-7 h-7" />
              </div>
              <p className="text-gray-600 dark:text-gray-300 font-medium mb-1">Nenhum item de checklist</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Os itens do checklist podem ser criados a partir dos templates ou extraídos do edital através da Inteligência Artificial. Não há itens cadastrados para esta licitação.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const isUpdating = updatingIds.has(item.id);
            const canComplete = !item.exigeEvidencia || item.evidenciaId;

            return (
              <Card
                key={item.id}
                className={`shadow-sm border-gray-200 dark:border-gray-700 transition-colors ${item.concluido ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20" : "hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
              >
                <CardContent className="py-4">
                  <div className="flex items-start gap-4">
                    {isUpdating ? (
                      <div className="flex-shrink-0 w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mt-1" />
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleToggleItem(item)}
                        disabled={!item.concluido && !canComplete}
                        className="mt-0.5 flex-shrink-0 rounded-full p-1 text-emerald-600 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
                        aria-label={item.concluido ? `Desmarcar ${item.titulo}` : `Marcar ${item.titulo} como concluído`}
                      >
                        {item.concluido ? (
                          <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                        ) : (
                          <Circle className="w-6 h-6 text-slate-400" />
                        )}
                      </button>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <h3
                          className={`font-heading font-medium ${item.concluido ? "text-gray-500 dark:text-gray-400 line-through" : "text-gray-900 dark:text-gray-100"
                            }`}
                        >
                          {item.titulo}
                        </h3>
                        {item.exigeEvidencia && (
                          <span
                            className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${item.evidenciaId
                              ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-400"
                              : "bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-400"
                              }`}
                          >
                            {item.evidenciaId ? "Evidência OK" : "Exige evidência"}
                          </span>
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto text-gray-500">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenEditModal(item)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              <span>Editar</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => confirmDelete(item)} className="text-red-600 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-950/50">
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Excluir</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                      </div>
                      {item.descricao && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{item.descricao}</p>
                      )}
                      {item.concluido && item.concluidoEm && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          Concluído em {formatDate(item.concluidoEm)}
                        </p>
                      )}
                      {!item.concluido && item.exigeEvidencia && !item.evidenciaId && (
                        <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Vincule um documento antes de marcar como concluído.
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar Item do Checklist" : "Novo Item do Checklist"}</DialogTitle>
            <DialogDescription>
              {isEditing ? "Altere as informações deste item." : "Adicione um item manual obrigatório ou opcional a este checklist."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Título do Item <span className="text-red-500">*</span></Label>
              <Input
                placeholder="Ex: Requerer termo de compromisso"
                value={newItemData.titulo}
                onChange={(e) => setNewItemData({ ...newItemData, titulo: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição (Opcional)</Label>
              <Textarea
                placeholder="Ex: O documento está no anexo III, página 42..."
                value={newItemData.descricao}
                onChange={(e) => setNewItemData({ ...newItemData, descricao: e.target.value })}
                className="resize-none"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50/50 dark:bg-gray-800/20 dark:border-gray-700">
              <div className="space-y-0.5">
                <Label>Exige Anexo de Documento?</Label>
                <div className="text-[0.8rem] text-muted-foreground">
                  Bloqueia a conclusão até que haja evidência ({`"Evidência OK"`})
                </div>
              </div>
              <Switch
                checked={newItemData.exigeEvidencia}
                onCheckedChange={(checked) => setNewItemData({ ...newItemData, exigeEvidencia: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isCreating}>
              Cancelar
            </Button>
            <Button onClick={handleCreateOrUpdateItem} disabled={isCreating}>
              {isCreating ? "Salvando..." : isEditing ? "Salvar Alterações" : "Salvar Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Item</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir permanentemente este item do checklist? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteItem} disabled={isDeleting}>
              {isDeleting ? "Excluindo..." : "Excluir Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
}
