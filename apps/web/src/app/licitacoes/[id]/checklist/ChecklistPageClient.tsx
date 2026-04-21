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
      <Card className="border-border shadow-sm">
        <CardContent className="py-16">
          <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
            <span>Carregando checklist...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && items.length === 0) {
    return (
      <Card className="border-destructive/40 bg-destructive/5 shadow-sm">
        <CardContent className="py-12">
          <div className="text-center">
            <p className="mb-4 font-medium text-destructive">{error}</p>
            <Button variant="outline" onClick={loadItems} className="border-destructive/30 hover:bg-destructive/10">
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
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Resumo */}
      <Card className="border-border shadow-sm">
        <CardContent className="py-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-foreground">
                <ListChecks className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Progresso do checklist</p>
                <p className="mt-0.5 font-heading text-xl font-bold text-foreground">
                  {completedCount} de {totalCount} itens concluídos
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-heading text-3xl font-bold text-foreground">{progress}%</p>
            </div>
          </div>
          <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-2.5 rounded-full bg-foreground transition-all duration-300"
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
          className="gap-2 rounded-lg px-3 py-1.5 text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Adicionar Item
        </Button>
        <Button
          variant="secondary"
          onClick={handleGerarIA}
          disabled={isGenerating}
          className="gap-2 rounded-lg px-3 py-1.5 text-sm font-medium"
        >
          {isGenerating ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-foreground" />
          ) : (
            <span className="text-lg leading-none">✨</span>
          )}
          Gerar a partir da Análise IA
        </Button>
      </div>

      {/* Lista de itens */}
      {items.length === 0 ? (
        <Card className="border-border shadow-sm">
          <CardContent className="px-4 py-16">
            <div className="text-center">
              <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <ListChecks className="h-7 w-7" />
              </div>
              <p className="mb-1 font-medium text-foreground">Nenhum item de checklist</p>
              <p className="text-sm text-muted-foreground">
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
                className={`border-border bg-card shadow-sm transition-colors ${item.concluido ? "border-foreground/20 bg-muted/40" : "hover:border-border hover:bg-accent/30"
                  }`}
              >
                <CardContent className="py-4">
                  <div className="flex items-start gap-4">
                    {isUpdating ? (
                      <div className="mt-1 h-6 w-6 flex-shrink-0 animate-spin rounded-full border-2 border-muted border-t-foreground" />
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleToggleItem(item)}
                        disabled={!item.concluido && !canComplete}
                        className="mt-0.5 flex-shrink-0 rounded-full p-1 text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
                        aria-label={item.concluido ? `Desmarcar ${item.titulo}` : `Marcar ${item.titulo} como concluído`}
                      >
                        {item.concluido ? (
                          <CheckCircle2 className="h-6 w-6 text-foreground" />
                        ) : (
                          <Circle className="h-6 w-6 text-muted-foreground" />
                        )}
                      </button>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <h3
                          className={`font-heading font-medium ${item.concluido ? "text-muted-foreground line-through" : "text-foreground"
                            }`}
                        >
                          {item.titulo}
                        </h3>
                        {item.exigeEvidencia && (
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${item.evidenciaId
                              ? "bg-muted text-foreground"
                              : "bg-muted text-muted-foreground"
                              }`}
                          >
                            {item.evidenciaId ? "Evidência OK" : "Exige evidência"}
                          </span>
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="ml-auto h-8 w-8 text-muted-foreground">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenEditModal(item)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              <span>Editar</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => confirmDelete(item)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Excluir</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                      </div>
                      {item.descricao && (
                        <p className="mt-1 text-sm text-muted-foreground">{item.descricao}</p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.exigeEvidencia ? "Documento Obrigatório" : "Documento Opcional"}
                      </p>
                      {item.concluido && item.concluidoEm && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Concluído em {formatDate(item.concluidoEm)}
                        </p>
                      )}
                      {!item.concluido && item.exigeEvidencia && !item.evidenciaId && (
                        <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
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
              <Label>Título do Item <span className="text-destructive">*</span></Label>
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
