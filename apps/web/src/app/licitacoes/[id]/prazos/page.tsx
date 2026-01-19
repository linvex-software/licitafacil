import Link from "next/link";
import { Card, CardContent } from "@/components/ui/Card";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PrazosPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6">
          <Link
            href={`/licitacoes/${id}`}
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mb-4 inline-block"
          >
            ← Voltar para licitação
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Prazos
          </h1>
        </div>

        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                TODO: Implementar página de prazos quando F1-06 estiver concluída.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Licitação ID: {id}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
