"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UploadPdfDropzoneProps {
  onFileSelect: (file: File | null) => void;
  disabled?: boolean;
}

export function UploadPdfDropzone({
  onFileSelect,
  disabled,
}: UploadPdfDropzoneProps) {
  const [arquivo, setArquivo] = useState<File | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setArquivo(file);
        onFileSelect(file);
      }
    },
    [onFileSelect],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024, // 50MB
    disabled,
  });

  function removerArquivo() {
    setArquivo(null);
    onFileSelect(null);
  }

  if (arquivo) {
    return (
      <div className="border-2 border-dashed border-slate-300 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-10 h-10 text-blue-500" />
            <div>
              <p className="font-medium text-slate-900">{arquivo.name}</p>
              <p className="text-sm text-slate-500">
                {(arquivo.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={removerArquivo}
            disabled={disabled}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
        transition-colors
        ${isDragActive ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:border-slate-400"}
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
      `}
    >
      <input {...getInputProps()} />
      <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400" />
      {isDragActive ? (
        <p className="text-blue-600 font-medium">Solte o arquivo aqui...</p>
      ) : (
        <>
          <p className="text-slate-600 mb-2">
            Arraste e solte o PDF do edital aqui
          </p>
          <p className="text-sm text-slate-500">
            ou clique para selecionar (máx. 50MB)
          </p>
        </>
      )}
    </div>
  );
}
