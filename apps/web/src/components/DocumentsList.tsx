"use client";

import { useState, useEffect } from "react";
import { type Document, DocumentCategory } from "@licitafacil/shared";
import { fetchDocuments, downloadDocument, deleteDocument } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { DocumentVersions } from "./DocumentVersions";

interface DocumentsListProps {
  bidId?: string; // Mantido para compatibilidade futura, pode ser usado para filtrar por licitação
  onError: (error: string) => void;
}

const categoryLabels: Record<string, string> = {
  CONTRATOS: "Contratos",
  CERTIFICADOS: "Certificados",
  CERTIDOES: "Certidões",
  LICENCAS: "Licenças",
  PROPOSTAS: "Propostas",
  HABILITACAO: "Habilitação",
  COMPROVANTES: "Comprovantes",
  FINANCEIRO: "Financeiro",
  ADMINISTRATIVO: "Administrativo",
  OUTROS: "Outros",
};

const categoryColors: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  CONTRATOS: "info",
  CERTIFICADOS: "success",
  CERTIDOES: "success",
  LICENCAS: "warning",
  PROPOSTAS: "info",
  HABILITACAO: "warning",
  COMPROVANTES: "default",
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

export function DocumentsList({ bidId, onError }: DocumentsListProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [expandedDocument, setExpandedDocument] = useState<string | null>(null);

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const response = await fetchDocuments({
        page,
        limit: 20,
        bidId: bidId || undefined,
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
  }, [page, selectedCategory, searchQuery, bidId]);

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
      <Card className="shadow-sm border-slate-200">
        <CardContent className="py-16">
          <div className="flex flex-col items-center justify-center gap-3 text-slate-500">
            <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            <span>Carregando documentos...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card className="shadow-sm border-slate-200">
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
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900
                  focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder:text-slate-400"
              />
            </div>
            <div className="sm:w-48">
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900
                  focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
        <Card className="shadow-sm border-slate-200">
          <CardContent className="py-16 px-4">
            <div className="text-center">
              <p className="text-slate-600 font-medium mb-1">Nenhum documento encontrado</p>
              <p className="text-sm text-slate-500">
                {bidId ? "Envie o primeiro documento desta licitação usando o botão acima." : "Envie um documento usando o botão acima."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {documents.map((doc) => (
              <Card key={doc.id} className="shadow-sm border-slate-200 hover:border-slate-300 transition-colors">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-heading font-semibold text-slate-900 truncate">
                          {doc.name}
                        </h3>
                        <Badge variant={categoryColors[doc.category] || "default"}>
                          {categoryLabels[doc.category] || doc.category}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
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
                        className="px-3 py-1.5 text-sm bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-medium transition-colors"
                      >
                        Download
                      </button>
                      <button
                        onClick={() =>
                          setExpandedDocument(expandedDocument === doc.id ? null : doc.id)
                        }
                        className="px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
                      >
                        {expandedDocument === doc.id ? "Ocultar versões" : "Versões"}
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        disabled={isDeleting === doc.id}
                        className="px-3 py-1.5 text-sm bg-red-50 hover:bg-red-100 text-red-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isDeleting === doc.id ? "Excluindo..." : "Excluir"}
                      </button>
                    </div>
                  </div>
                  {expandedDocument === doc.id && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <DocumentVersions
                        documentId={doc.id}
                        onError={onError}
                        onVersionRestored={() => {
                          loadDocuments();
                          setExpandedDocument(null);
                        }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4">
              <div className="text-sm text-slate-500">
                Mostrando {documents.length} de {total} documentos
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Anterior
                </button>
                <span className="px-3 py-1.5 text-sm text-slate-600">
                  Página {page} de {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
