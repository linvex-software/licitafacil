"use client";

import { useState } from "react";
import { DocumentCategory, ALLOWED_MIME_TYPES, MAX_FILE_SIZE, type CreateDocumentInput } from "@licitafacil/shared";
import { uploadDocument } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface DocumentUploadProps {
  bidId?: string;
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

export function DocumentUpload({ bidId, onUploadSuccess, onError }: DocumentUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState<CreateDocumentInput & { bidId?: string }>({
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
      await uploadDocument(selectedFile, {
        name: formData.name,
        category: formData.category,
        bidId: bidId || formData.bidId,
      });
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
      <Button onClick={() => setIsOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 shadow-sm">
        + Adicionar Documento
      </Button>

      <Dialog open={isOpen} onOpenChange={(open) => (open ? setIsOpen(true) : !isUploading && handleClose())}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Adicionar Documento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label className="text-slate-700">Arquivo *</Label>
              <input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                disabled={isUploading}
                className="block w-full text-sm text-slate-900 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer disabled:opacity-50"
              />
              {errors.file && <p className="text-sm text-red-600">{errors.file}</p>}
              {selectedFile && (
                <p className="text-sm text-slate-500">
                  {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label className="text-slate-700">Nome do Documento *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                disabled={isUploading}
                maxLength={255}
                placeholder="Ex: Edital 001/2026"
                className="border-slate-200 focus-visible:ring-emerald-500"
              />
              {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
            </div>
            <div className="grid gap-2">
              <Label className="text-slate-700">Categoria *</Label>
              <select
                value={formData.category}
                onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value as any }))}
                disabled={isUploading}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                {Object.entries(DocumentCategory).map(([key, value]) => (
                  <option key={key} value={value}>
                    {categoryLabels[value] || value}
                  </option>
                ))}
              </select>
            </div>
            <DialogFooter className="gap-2 sm:gap-0 pt-4">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isUploading} className="border-slate-200">
                Cancelar
              </Button>
              <Button type="submit" disabled={isUploading} className="bg-emerald-600 hover:bg-emerald-700">
                {isUploading ? "Enviando..." : "Enviar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
