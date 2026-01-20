"use client";

import { useState, useEffect } from "react";
import { type Document, DocumentCategory } from "@licitafacil/shared";
import { fetchDocuments, downloadDocument, deleteDocument } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";

interface DocumentsListProps {
  bidId?: string; // Mantido para compatibilidade futura, pode ser usado para filtrar por licitação
  onError: (error: string) => void;
}

const categoryLabels: Record<string, string> = {
  CONTRATOS: "Contratos",
  CERTIFICADOS: "Certificados",
  LICENCAS: "Licenças",
  FINANCEIRO: "Financeiro",
  ADMINISTRATIVO: "Administrativo",
  OUTROS: "Outros",
};

const categoryColors: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  CONTRATOS: "info",
  CERTIFICADOS: "success",
  LICENCAS: "warning",
  FINANCEIRO: "danger",
  ADMINISTRATIVO: "default",
  OUTROS: "default",
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DocumentsList({ bidId: _bidId, onError }: DocumentsListProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const response = await fetchDocuments({
        page,
        limit: 20,
        category: selectedCategory || undefined,
        search: searchQuery || undefined,
      });
      setDocuments(response.data);
      setTotalPages(response.pagination.totalPages);
      setTotal(response.pagination.total);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Erro ao carregar documentos");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, selectedCategory, searchQuery]);

  const handleDownload = async (document: Document) => {
    try {
      await downloadDocument(document.id, document.name);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Erro ao fazer download");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este documento?")) return;

    setIsDeleting(id);
    try {
      await deleteDocument(id);
      await loadDocuments();
    } catch (error) {
      onError(error instanceof Error ? error.message : "Erro ao excluir documento");
    } finally {
      setIsDeleting(null);
    }
  };


  if (isLoading && documents.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-gray-600 dark:text-gray-400">
            Carregando documentos...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Buscar por nome..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                  focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="sm:w-48">
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                  focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todas as categorias</option>
                {Object.entries(DocumentCategory).map(([key, value]) => (
                  <option key={key} value={value}>
                    {categoryLabels[value] || value}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de documentos */}
      {documents.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-600 dark:text-gray-400">
              Nenhum documento encontrado.
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {documents.map((doc) => (
              <Card key={doc.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                          {doc.name}
                        </h3>
                        <Badge variant={categoryColors[doc.category] || "default"}>
                          {categoryLabels[doc.category] || doc.category}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>{formatFileSize(doc.size)}</span>
                        <span>•</span>
                        <span>Enviado em {formatDate(doc.createdAt)}</span>
                        {doc.mimeType && (
                          <>
                            <span>•</span>
                            <span className="uppercase">{doc.mimeType.split("/")[1]}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleDownload(doc)}
                        className="px-3 py-1.5 text-sm bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30
                          text-blue-700 dark:text-blue-300 rounded-lg font-medium transition-colors"
                      >
                        📥 Download
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        disabled={isDeleting === doc.id}
                        className="px-3 py-1.5 text-sm bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30
                          text-red-700 dark:text-red-300 rounded-lg font-medium transition-colors
                          disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isDeleting === doc.id ? "Excluindo..." : "🗑️ Excluir"}
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Mostrando {documents.length} de {total} documentos
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg
                    bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300
                    hover:bg-gray-50 dark:hover:bg-gray-600
                    disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Anterior
                </button>
                <span className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300">
                  Página {page} de {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg
                    bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300
                    hover:bg-gray-50 dark:hover:bg-gray-600
                    disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
