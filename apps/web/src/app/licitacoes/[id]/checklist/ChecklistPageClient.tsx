"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import {
  fetchChecklistItems,
  markChecklistItemCompleted,
  markChecklistItemIncomplete,
} from "@/lib/api";
import type { LicitacaoChecklistItem } from "@licitafacil/shared";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Circle, AlertCircle, ListChecks } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  const [error, setError] = useState<string | null>(null);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
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

  if (loading) {
    return (
      <Card className="shadow-sm border-slate-200">
        <CardContent className="py-16">
          <div className="flex flex-col items-center justify-center gap-3 text-slate-500">
            <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            <span>Carregando checklist...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && items.length === 0) {
    return (
      <Card className="shadow-sm border-slate-200 border-red-200 bg-red-50/50">
        <CardContent className="py-12">
          <div className="text-center">
            <p className="text-red-700 font-medium mb-4">{error}</p>
            <Button variant="outline" onClick={loadItems} className="border-red-200 hover:bg-red-50">
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
      <Card className="shadow-sm border-slate-200">
        <CardContent className="py-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600">
                <ListChecks className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Progresso do checklist</p>
                <p className="text-xl font-heading font-bold text-slate-900 mt-0.5">
                  {completedCount} de {totalCount} itens concluídos
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-heading font-bold text-emerald-600">{progress}%</p>
            </div>
          </div>
          <div className="mt-4 w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de itens */}
      {items.length === 0 ? (
        <Card className="shadow-sm border-slate-200">
          <CardContent className="py-16 px-4">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-100 text-slate-400 mb-4">
                <ListChecks className="w-7 h-7" />
              </div>
              <p className="text-slate-600 font-medium mb-1">Nenhum item de checklist</p>
              <p className="text-sm text-slate-500">
                Os itens do checklist são criados a partir dos templates. Não há itens cadastrados para esta licitação.
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
                className={`shadow-sm border-slate-200 transition-colors ${
                  item.concluido ? "border-emerald-200 bg-emerald-50/50" : "hover:border-slate-300"
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
                          className={`font-heading font-medium ${
                            item.concluido ? "text-slate-500 line-through" : "text-slate-900"
                          }`}
                        >
                          {item.titulo}
                        </h3>
                        {item.exigeEvidencia && (
                          <span
                            className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${
                              item.evidenciaId
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {item.evidenciaId ? "Evidência OK" : "Exige evidência"}
                          </span>
                        )}
                      </div>
                      {item.descricao && (
                        <p className="text-sm text-slate-500 mt-1">{item.descricao}</p>
                      )}
                      {item.concluido && item.concluidoEm && (
                        <p className="text-xs text-slate-500 mt-2">
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
    </div>
  );
}
