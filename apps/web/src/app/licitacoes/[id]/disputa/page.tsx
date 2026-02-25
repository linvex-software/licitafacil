import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { SimuladorDisputa } from "@/components/disputa/SimuladorDisputa";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DisputaLicitacaoPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <Layout>
      <div className="mx-auto space-y-6">
        <div>
          <Link href={`/licitacoes/${id}`}>
            <Button variant="ghost" className="pl-0 text-slate-500 hover:text-slate-900 hover:bg-transparent mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para licitação
            </Button>
          </Link>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-slate-900 mb-2">
            Disputa
          </h1>
          <p className="text-slate-600">
            Simule lances com base no cenário da licitação e acompanhe o histórico salvo.
          </p>
        </div>

        <SimuladorDisputa bidId={id} autoSave showHistorico />
      </div>
    </Layout>
  );
}
