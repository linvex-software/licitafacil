import Link from "next/link";
import { Card, CardContent } from "@/components/ui/Card";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 ">
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                Licitação não encontrada
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                A licitação que você está procurando não existe ou foi removida.
              </p>
              <Link
                href="/"
                className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                Voltar ao início
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
