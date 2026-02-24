import Link from "next/link";
import { ChecklistPageClient } from "./ChecklistPageClient";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ChecklistPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <Layout>
      <div className="mx-auto">
        <PageHeader
          breadcrumb={[
            { label: "Gestão", href: "/" },
            { label: "Processos", href: "/licitacoes" },
            { label: "Detalhes", href: `/licitacoes/${id}` },
            { label: "Checklist" },
          ]}
          title="Checklist da Licitação"
          subtitle="Gerencie os itens obrigatórios desta licitação. Marque como concluído e anexe evidências quando necessário."
          actions={
            <Link href={`/licitacoes/${id}`}>
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar para licitação
              </Button>
            </Link>
          }
        />

        <ChecklistPageClient licitacaoId={id} />
      </div>
    </Layout>
  );
}
