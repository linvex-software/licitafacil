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
      <div className="container mx-auto px-4 py-8 ">
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
                <p className="mb-6 rounded border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                  {error.message}
                </p>
              )}
              <div className="flex gap-4 justify-center">
                <button
                  onClick={reset}
                  className="rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground transition-opacity hover:opacity-90 dark:hover:bg-[#e0e0e0]"
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
