import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { SimuladorDisputa } from "@/components/disputa/SimuladorDisputa";
import { RegistrarResultadoLicitacaoCard } from "@/components/disputa/RegistrarResultadoLicitacaoCard";

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
          <div className="mb-2 inline-flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-sm font-medium text-foreground">
            ⚠️ Simulação — os valores calculados são estimativas e não garantem resultado real.
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            Simule lances com base no cenário da licitação e acompanhe o histórico salvo.
          </p>
        </div>

        <SimuladorDisputa bidId={id} autoSave showHistorico />

        <RegistrarResultadoLicitacaoCard bidId={id} />
      </div>
    </Layout>
  );
}
