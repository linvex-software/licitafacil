"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import {
  fetchChecklistItems,
  markChecklistItemCompleted,
  markChecklistItemIncomplete,
} from "@/lib/api";
import type { LicitacaoChecklistItem } from "@licitafacil/shared";

interface ChecklistPageClientProps {
  licitacaoId: string;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ChecklistPageClient({ licitacaoId }: ChecklistPageClientProps) {
  const [items, setItems] = useState<LicitacaoChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

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
        // Desmarcar
        await markChecklistItemIncomplete(item.id);
      } else {
        // Marcar como concluído
        // Se exige evidência e não tem, mostrar erro
        if (item.exigeEvidencia && !item.evidenciaId) {
          setError(
            "Este item exige evidência. É necessário vincular um documento antes de marcar como concluído.",
          );
          setUpdatingIds((prev) => {
            const next = new Set(prev);
            next.delete(item.id);
            return next;
          });
          return;
        }

        await markChecklistItemCompleted(item.id, item.evidenciaId);
      }

      // Recarregar lista (limpa erro se sucesso)
      setError(null);
      await loadItems();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao atualizar item";
      setError(errorMessage);
      // Manter estado atualizado mesmo em caso de erro
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
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400">Carregando checklist...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            <button
              onClick={loadItems}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Tentar novamente
            </button>
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
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Resumo */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Progresso do Checklist
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {completedCount} de {totalCount} itens concluídos
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{progress}%</p>
            </div>
          </div>
          <div className="mt-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de itens */}
      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-400">
                Nenhum item de checklist cadastrado para esta licitação.
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
                className={item.concluido ? "bg-green-50 dark:bg-green-900/10" : ""}
              >
                <CardContent className="py-4">
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center gap-1">
                      <input
                        type="checkbox"
                        checked={item.concluido}
                        onChange={() => handleToggleItem(item)}
                        disabled={isUpdating || (!item.concluido && !canComplete)}
                        className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label={item.concluido ? `Desmarcar ${item.titulo}` : `Marcar ${item.titulo} como concluído`}
                      />
                      {isUpdating && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          ...
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h3
                            className={`font-medium ${
                              item.concluido
                                ? "text-gray-500 dark:text-gray-400 line-through"
                                : "text-gray-900 dark:text-white"
                            }`}
                          >
                            {item.titulo}
                          </h3>
                          {item.descricao && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {item.descricao}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {item.exigeEvidencia && (
                            <span
                              className={`text-xs px-2 py-1 rounded ${
                                item.evidenciaId
                                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                  : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                              }`}
                            >
                              {item.evidenciaId ? "Evidência OK" : "Exige evidência"}
                            </span>
                          )}
                        </div>
                      </div>

                      {item.concluido && item.concluidoEm && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          Concluído em {formatDate(item.concluidoEm)}
                        </p>
                      )}

                      {!item.concluido && item.exigeEvidencia && !item.evidenciaId && (
                        <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                          ⚠️ Este item exige evidência. Vincule um documento antes de marcar como
                          concluído.
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
