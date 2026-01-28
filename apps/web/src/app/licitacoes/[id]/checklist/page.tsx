import Link from "next/link";
import { ChecklistPageClient } from "./ChecklistPageClient";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ChecklistPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <Layout>
      <div className="mx-auto">
        <div className="mb-8">
          <Link href={`/licitacoes/${id}`}>
            <Button variant="ghost" className="pl-0 text-slate-500 hover:text-slate-900 hover:bg-transparent mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para licitação
            </Button>
          </Link>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-slate-900 mb-2">
            Checklist da Licitação
          </h1>
          <p className="text-slate-600">
            Gerencie os itens obrigatórios desta licitação. Marque como concluído e anexe evidências quando necessário.
          </p>
        </div>

        <ChecklistPageClient licitacaoId={id} />
      </div>
    </Layout>
  );
}
