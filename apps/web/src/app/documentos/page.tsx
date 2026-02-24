"use client";

import { Layout } from "@/components/layout";
import { DocumentsList } from "@/components/DocumentsList";
import { DocumentUpload } from "@/components/DocumentUpload";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/ui/page-header";

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
        <PageHeader
          breadcrumb={[
            { label: "Gestão", href: "/" },
            { label: "Biblioteca" },
          ]}
          title="Biblioteca de Documentos"
          subtitle="Todos os documentos da empresa. Você pode filtrar por categoria, buscar por nome e enviar novos documentos."
          actions={
            <DocumentUpload onUploadSuccess={handleUploadSuccess} onError={handleError} />
          }
        />

        <DocumentsList onError={handleError} />
      </div>
    </Layout>
  );
}
