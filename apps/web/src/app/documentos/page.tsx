"use client";

import { Layout } from "@/components/layout";
import { DocumentsList } from "@/components/DocumentsList";
import { DocumentUpload } from "@/components/DocumentUpload";
import { useToast } from "@/hooks/use-toast";
import { AuthGuard } from "@/components/AuthGuard";

export default function DocumentosPage() {
  const { toast } = useToast();

  const handleError = (error: string) => {
    toast({ title: "Erro", description: error, variant: "destructive" });
  };

  const handleUploadSuccess = () => {
    toast({ title: "Documento enviado com sucesso" });
    window.location.reload();
  };

  return (
    <AuthGuard>
      <Layout>
        <div className="mx-auto w-full">
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-heading font-bold text-gray-900 dark:text-gray-100 mb-2">
              Documentos da empresa
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Todos os documentos da empresa. Você pode filtrar por categoria, buscar por nome e enviar novos documentos.
            </p>
          </div>

          <div className="mb-6 flex flex-col sm:flex-row gap-3 sm:justify-end">
            <DocumentUpload onUploadSuccess={handleUploadSuccess} onError={handleError} />
          </div>

          <DocumentsList onError={handleError} />
        </div>
      </Layout>
    </AuthGuard>
  );
}
