import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { PerguntasTab } from "@/components/perguntas/PerguntasTab";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PerguntasPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <Layout>
      <div className="mx-auto">
        <div className="mb-8">
          <Link href={`/licitacoes/${id}`}>
            <Button
              variant="ghost"
              className="pl-0 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-transparent mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para licitação
            </Button>
          </Link>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-slate-900 dark:text-white mb-2">
            Chat com o Edital
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Faça perguntas sobre o edital analisado pela IA
          </p>
        </div>

        <PerguntasTab bidId={id} />
      </div>
    </Layout>
  );
}
