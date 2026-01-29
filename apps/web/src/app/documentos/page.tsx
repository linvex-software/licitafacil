"use client";

import { Layout } from "@/components/layout";
import { DocumentsList } from "@/components/DocumentsList";
import { DocumentUpload } from "@/components/DocumentUpload";
import { useToast } from "@/hooks/use-toast";

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
    <Layout>
      <div className="mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-slate-900 mb-2">
            Documentos da empresa
          </h1>
          <p className="text-slate-600">
            Todos os documentos da empresa. Você pode filtrar por categoria, buscar por nome e enviar novos documentos.
          </p>
        </div>

        <div className="mb-6 flex justify-end">
          <DocumentUpload onUploadSuccess={handleUploadSuccess} onError={handleError} />
        </div>

        <DocumentsList onError={handleError} />
      </div>
    </Layout>
  );
}
