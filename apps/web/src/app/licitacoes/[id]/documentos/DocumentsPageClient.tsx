"use client";

import { DocumentsList } from "@/components/DocumentsList";
import { DocumentUpload, type DocumentUploadRef } from "@/components/DocumentUpload";
import { useToast } from "@/hooks/use-toast";
import { useRef } from "react";

interface DocumentsPageClientProps {
  bidId: string;
}

export function DocumentsPageClient({ bidId }: DocumentsPageClientProps) {
  const { toast } = useToast();
  const uploadRef = useRef<DocumentUploadRef>(null);

  const handleError = (error: string) => {
    toast({ title: "Erro", description: error, variant: "destructive" });
  };

  const handleUploadSuccess = () => {
    toast({ title: "Documento enviado com sucesso" });
    window.location.reload();
  };

  const handleUploadRequest = (documentId: string, category: string) => {
    uploadRef.current?.openUploadModal(documentId, category, undefined);
  };

  return (
    <>
      <div className="mb-6 flex justify-end">
        <DocumentUpload ref={uploadRef} bidId={bidId} onUploadSuccess={handleUploadSuccess} onError={handleError} />
      </div>
      <DocumentsList bidId={bidId} onError={handleError} onUploadRequest={handleUploadRequest} />
    </>
  );
}
