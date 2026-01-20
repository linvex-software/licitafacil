"use client";

import { useState } from "react";
import { DocumentCategory, ALLOWED_MIME_TYPES, MAX_FILE_SIZE, type CreateDocumentInput } from "@licitafacil/shared";
import { uploadDocument } from "@/lib/api";

interface DocumentUploadProps {
  onUploadSuccess: () => void;
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

export function DocumentUpload({ onUploadSuccess, onError }: DocumentUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState<CreateDocumentInput>({
    name: "",
    category: DocumentCategory.OUTROS,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_MIME_TYPES.includes(file.type as any)) {
      return `Tipo de arquivo não permitido. Tipos permitidos: PDF, JPG, PNG, DOC, DOCX, XLS, XLSX`;
    }

    if (file.size > MAX_FILE_SIZE) {
      const maxSizeMB = MAX_FILE_SIZE / (1024 * 1024);
      return `Arquivo muito grande. Tamanho máximo: ${maxSizeMB}MB`;
    }

    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      onError(error);
      return;
    }

    setSelectedFile(file);
    setErrors((prev) => ({ ...prev, file: "" }));

    // Preencher nome automaticamente se estiver vazio
    if (!formData.name) {
      setFormData((prev) => ({ ...prev, name: file.name.replace(/\.[^/.]+$/, "") }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validações
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = "Nome é obrigatório";
    }
    if (!selectedFile) {
      newErrors.file = "Arquivo é obrigatório";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (!selectedFile) return;

    setIsUploading(true);
    try {
      await uploadDocument(selectedFile, formData);
      setIsOpen(false);
      setFormData({ name: "", category: DocumentCategory.OUTROS });
      setSelectedFile(null);
      onUploadSuccess();
    } catch (error) {
      onError(error instanceof Error ? error.message : "Erro ao fazer upload do documento");
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setIsOpen(false);
      setFormData({ name: "", category: DocumentCategory.OUTROS });
      setSelectedFile(null);
      setErrors({});
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
      >
        + Adicionar Documento
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Adicionar Documento
                </h2>
                <button
                  onClick={handleClose}
                  disabled={isUploading}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Arquivo *
                </label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  disabled={isUploading}
                  className="block w-full text-sm text-gray-900 dark:text-gray-300
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100
                    dark:file:bg-blue-900/20 dark:file:text-blue-300
                    cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {errors.file && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.file}</p>
                )}
                {selectedFile && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Arquivo selecionado: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nome do Documento *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  disabled={isUploading}
                  maxLength={255}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                    focus:ring-2 focus:ring-blue-500 focus:border-transparent
                    disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Categoria *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, category: e.target.value as any }))
                  }
                  disabled={isUploading}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                    focus:ring-2 focus:ring-blue-500 focus:border-transparent
                    disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {Object.entries(DocumentCategory).map(([key, value]) => (
                    <option key={key} value={value}>
                      {categoryLabels[value] || value}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isUploading}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700
                    hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-medium
                    disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium
                    disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isUploading ? "Enviando..." : "Enviar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
