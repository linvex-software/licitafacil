"use client";

import { DocumentsList } from "@/components/DocumentsList";
import { DocumentUpload } from "@/components/DocumentUpload";

interface DocumentsPageClientProps {
  bidId: string;
}

export function DocumentsPageClient({ bidId }: DocumentsPageClientProps) {
  const handleError = (error: string) => {
    // Por enquanto, apenas loga o erro. Em produção, você pode usar um toast ou outro sistema de notificação
    console.error("Erro:", error);
    alert(error); // Substitua por um sistema de notificações adequado
  };

  const handleUploadSuccess = () => {
    // Recarrega a página para mostrar o novo documento
    window.location.reload();
  };

  return (
    <>
      <div className="mb-4 flex justify-end">
        <DocumentUpload onUploadSuccess={handleUploadSuccess} onError={handleError} />
      </div>
      <DocumentsList bidId={bidId} onError={handleError} />
    </>
  );
}
