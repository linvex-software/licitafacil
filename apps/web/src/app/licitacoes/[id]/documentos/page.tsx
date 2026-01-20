import Link from "next/link";
import { DocumentsPageClient } from "./DocumentsPageClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DocumentosPage({ params }: PageProps) {
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Documentos
          </h1>
        </div>

        <DocumentsPageClient bidId={id} />
      </div>
    </div>
  );
}
