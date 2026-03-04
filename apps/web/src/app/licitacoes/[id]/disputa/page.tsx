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
            <Button variant="ghost" className="pl-0 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-transparent mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para licitação
            </Button>
          </Link>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-slate-900 dark:text-white mb-2">
            Simulador de Disputa
          </h1>
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-sm font-medium mb-2">
            ⚠️ Simulação — os valores calculados são estimativas e não garantem resultado real.
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            Simule lances com base no cenário da licitação e acompanhe o histórico salvo.
          </p>
        </div>

        <SimuladorDisputa bidId={id} autoSave showHistorico />
      </div>
    </Layout>
  );
}
