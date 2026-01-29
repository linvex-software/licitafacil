"use client";

import { useState, useEffect } from "react";
import { type DocumentVersion } from "@licitafacil/shared";
import { fetchDocumentVersions, restoreDocumentVersion, downloadDocument } from "@/lib/api";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface DocumentVersionsProps {
  documentId: string;
  onError: (error: string) => void;
  onVersionRestored?: () => void;
}

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

export function DocumentVersions({
  documentId,
  onError,
  onVersionRestored,
}: DocumentVersionsProps) {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRestoring, setIsRestoring] = useState<string | null>(null);

  const loadVersions = async () => {
    setIsLoading(true);
    try {
      const data = await fetchDocumentVersions(documentId);
      setVersions(data);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Erro ao carregar versões");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVersions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  const handleRestore = async (versionNumber: number) => {
    if (
      !confirm(
        `Tem certeza que deseja restaurar a versão ${versionNumber}? A versão atual será substituída.`,
      )
    ) {
      return;
    }

    setIsRestoring(versionNumber.toString());
    try {
      await restoreDocumentVersion(documentId, versionNumber);
      await loadVersions();
      onVersionRestored?.();
    } catch (error) {
      onError(error instanceof Error ? error.message : "Erro ao restaurar versão");
    } finally {
      setIsRestoring(null);
    }
  };

  const handleDownload = async (version: DocumentVersion) => {
    try {
      // Usar o documentId e versionNumber para fazer download da versão específica
      // Por enquanto, vamos usar o endpoint de download normal (pode precisar de ajuste no backend)
      await downloadDocument(documentId, version.filename);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Erro ao fazer download");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-gray-600 dark:text-gray-400">
            Carregando versões...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (versions.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-gray-600 dark:text-gray-400">
            Nenhuma versão encontrada.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Histórico de Versões ({versions.length})
        </h3>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {versions.map((version) => (
            <div
              key={version.id}
              className={`p-4 rounded-lg border ${
                version.isCurrent
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Versão {version.versionNumber}
                    </span>
                    {version.isCurrent && (
                      <Badge variant="secondary">Versão Atual</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <span>{formatFileSize(version.size)}</span>
                    <span>•</span>
                    <span>Criada em {formatDate(version.createdAt)}</span>
                    {version.uploader && (
                      <>
                        <span>•</span>
                        <span>Por {version.uploader.name}</span>
                      </>
                    )}
                    {version.mimeType && (
                      <>
                        <span>•</span>
                        <span className="uppercase">{version.mimeType.split("/")[1]}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleDownload(version)}
                    className="px-3 py-1.5 text-sm bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30
                      text-blue-700 dark:text-blue-300 rounded-lg font-medium transition-colors"
                  >
                    📥 Download
                  </button>
                  {!version.isCurrent && (
                    <button
                      onClick={() => handleRestore(version.versionNumber)}
                      disabled={isRestoring === version.versionNumber.toString()}
                      className="px-3 py-1.5 text-sm bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30
                        text-green-700 dark:text-green-300 rounded-lg font-medium transition-colors
                        disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isRestoring === version.versionNumber.toString()
                        ? "Restaurando..."
                        : "↩️ Restaurar"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
