"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/Card";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erro na página de licitação:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                Erro ao carregar licitação
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Ocorreu um erro ao buscar os dados da licitação. Por favor, tente novamente.
              </p>
              {error.message && (
                <p className="text-sm text-red-600 dark:text-red-400 mb-6 bg-red-50 dark:bg-red-900/20 p-3 rounded">
                  {error.message}
                </p>
              )}
              <div className="flex gap-4 justify-center">
                <button
                  onClick={reset}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  Tentar novamente
                </button>
                <Link
                  href="/"
                  className="px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-lg transition-colors"
                >
                  Voltar ao início
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
