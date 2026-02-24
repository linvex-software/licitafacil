import Link from "next/link";
import { PrazosPageClient } from "./PrazosPageClient";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PrazosPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <Layout>
      <div className="mx-auto">
        <PageHeader
          breadcrumb={[
            { label: "Gestão", href: "/" },
            { label: "Processos", href: "/licitacoes" },
            { label: "Detalhes", href: `/licitacoes/${id}` },
            { label: "Prazos" },
          ]}
          title="Prazos"
          subtitle="Cadastre e acompanhe os prazos desta licitação. Os dias restantes são calculados automaticamente."
          actions={
            <Link href={`/licitacoes/${id}`}>
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar para licitação
              </Button>
            </Link>
          }
        />

        <PrazosPageClient bidId={id} />
      </div>
    </Layout>
  );
}
