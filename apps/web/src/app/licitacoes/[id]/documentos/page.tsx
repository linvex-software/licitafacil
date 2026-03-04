import Link from "next/link";
import { DocumentsPageClient } from "./DocumentsPageClient";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DocumentosPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <Layout>
      <div className="mx-auto">
        <div className="mb-8">
          <Link href={`/licitacoes/${id}`}>
            <Button variant="ghost" className="pl-0 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-transparent mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para licitação
            </Button>
          </Link>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-slate-900 dark:text-white mb-2">
            Documentos
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Envie, edite e acompanhe os documentos desta licitação. Você pode filtrar por categoria e buscar por nome.
          </p>
        </div>

        <DocumentsPageClient bidId={id} />
      </div>
    </Layout>
  );
}
