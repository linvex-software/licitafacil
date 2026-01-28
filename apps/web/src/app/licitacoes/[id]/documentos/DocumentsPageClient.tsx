"use client";

import { DocumentsList } from "@/components/DocumentsList";
import { DocumentUpload } from "@/components/DocumentUpload";
import { useToast } from "@/hooks/use-toast";

interface DocumentsPageClientProps {
  bidId: string;
}

export function DocumentsPageClient({ bidId }: DocumentsPageClientProps) {
  const { toast } = useToast();

  const handleError = (error: string) => {
    toast({ title: "Erro", description: error, variant: "destructive" });
  };

  const handleUploadSuccess = () => {
    toast({ title: "Documento enviado com sucesso" });
    window.location.reload();
  };

  return (
    <>
      <div className="mb-6 flex justify-end">
        <DocumentUpload bidId={bidId} onUploadSuccess={handleUploadSuccess} onError={handleError} />
      </div>
      <DocumentsList bidId={bidId} onError={handleError} />
    </>
  );
}
