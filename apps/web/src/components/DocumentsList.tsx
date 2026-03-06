"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { type Document, DocumentCategory } from "@licitafacil/shared";
import { fetchDocuments, deleteDocument, uploadDocument } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { DocumentVersions } from "./DocumentVersions";
import { Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getFileTypeLabel, getFileUrl } from "@/lib/utils";

interface DocumentsListProps {
  /** Quando não informado, lista todos os documentos da empresa (incluindo os vinculados a licitações). */
  bidId?: string;
  onError: (error: string) => void;
  /** Passado do componente pai para abrir o modal de upload real ou para gerenciar uploads via input local */
  onUploadRequest?: (documentId: string, category: string) => void;
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

const categoryColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  CONTRATOS: "default",
  CERTIFICADOS: "secondary",
  CERTIDOES: "secondary",
  LICENCAS: "outline",
  PROPOSTAS: "default",
  HABILITACAO: "outline",
  COMPROVANTES: "default",
  FINANCEIRO: "destructive",
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

export function DocumentsList({ bidId, onError, onUploadRequest: _onUploadRequest }: DocumentsListProps) {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
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

  const handleOpenFile = async (document: Document) => {
    try {
      const fileUrl = getFileUrl(document.url);
      if (!fileUrl) {
        onError("Documento sem arquivo enviado.");
        return;
      }
      window.open(fileUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      onError(error instanceof Error ? error.message : "Erro ao abrir arquivo");
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

  const handleUpload = async (doc: Document, file: File) => {
    setUploadingId(doc.id);
    try {
      await uploadDocument(file, {
        name: doc.name,
        category: doc.category,
        bidId: bidId || doc.bidId || undefined,
        documentId: doc.id,
      });
      toast({
        title: "Upload concluído",
        description: "Documento enviado com sucesso.",
      });
      await loadDocuments();
    } catch (error) {
      onError(error instanceof Error ? error.message : "Erro ao fazer upload");
    } finally {
      setUploadingId(null);
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
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                  focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>
            <div className="sm:w-48">
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
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
              <p className="text-gray-600 dark:text-gray-400 font-medium mb-1">Nenhum documento encontrado</p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                {bidId ? "Envie o primeiro documento desta licitação usando o botão acima." : "Envie um documento usando o botão acima."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {documents.map((doc) => (
              <Card key={doc.id} className="shadow-sm border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-heading font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {doc.name}
                        </h3>
                        <Badge variant={categoryColors[doc.category] || "default"}>
                          {categoryLabels[doc.category] || doc.category}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <span>{formatFileSize(doc.size)}</span>
                        <span>•</span>
                        <span>Enviado em {formatDate(doc.createdAt)}</span>
                        {doc.mimeType && (
                          <>
                            <span>•</span>
                            <span>{getFileTypeLabel(doc.mimeType, doc.filename)}</span>
                          </>
                        )}
                        {!bidId && doc.bidId && (
                          <>
                            <span>•</span>
                            <Link
                              href={`/licitacoes/${doc.bidId}/documentos`}
                              className="text-emerald-600 hover:text-emerald-700 font-medium"
                            >
                              Ver na licitação
                            </Link>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-shrink-0">
                      {(doc as any).status === "PENDENTE" ? (
                        <>
                          <Badge variant="outline" className="border-orange-500 text-orange-600 dark:border-orange-400 dark:text-orange-400 mr-2">
                            Pendente
                          </Badge>
                          <>
                            <input
                              type="file"
                              id={`upload-${doc.id}`}
                              className="hidden"
                              accept=".pdf,.doc,.docx,.png,.jpg"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) void handleUpload(doc, file);
                                e.currentTarget.value = "";
                              }}
                            />
                            <label
                              htmlFor={`upload-${doc.id}`}
                              className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                              <Upload className="h-3.5 w-3.5" />
                              {uploadingId === doc.id ? "Enviando..." : "Upload"}
                            </label>
                          </>
                        </>
                      ) : (
                        <button
                          onClick={() => void handleOpenFile(doc)}
                          className="px-3 py-1.5 text-sm bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 rounded-lg font-medium transition-colors"
                        >
                          Abrir
                        </button>
                      )}

                      {/* Oculta botão de Versões caso esteja pendente */}
                      {(doc as any).status !== "PENDENTE" && (
                        <button
                          onClick={() =>
                            setExpandedDocument(expandedDocument === doc.id ? null : doc.id)
                          }
                          className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                        >
                          {expandedDocument === doc.id ? "Ocultar versões" : "Versões"}
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(doc.id)}
                        disabled={isDeleting === doc.id}
                        className="px-3 py-1.5 text-sm bg-red-50 dark:bg-red-950/50 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isDeleting === doc.id ? "Excluindo..." : "Excluir"}
                      </button>
                    </div>
                  </div>
                  {expandedDocument === doc.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
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
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Mostrando {documents.length} de {total} documentos
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Anterior
                </button>
                <span className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400">
                  Página {page} de {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
