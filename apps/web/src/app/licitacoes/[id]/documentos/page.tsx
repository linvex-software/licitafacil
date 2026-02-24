import Link from "next/link";
import { DocumentsPageClient } from "./DocumentsPageClient";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DocumentosPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <Layout>
      <div className="mx-auto">
        <PageHeader
          breadcrumb={[
            { label: "Gestão", href: "/" },
            { label: "Processos", href: "/licitacoes" },
            { label: "Detalhes", href: `/licitacoes/${id}` },
            { label: "Documentos" },
          ]}
          title="Documentos"
          subtitle="Envie, edite e acompanhe os documentos desta licitação. Você pode filtrar por categoria e buscar por nome."
          actions={
            <Link href={`/licitacoes/${id}`}>
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar para licitação
              </Button>
            </Link>
          }
        />

        <DocumentsPageClient bidId={id} />
      </div>
    </Layout>
  );
}
