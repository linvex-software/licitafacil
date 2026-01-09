import { HealthCheck } from "@/components/HealthCheck";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <header className="text-center mb-16">
          <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-4">
            Licitafacil
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Sistema Profissional de Gestão de Licitações
          </p>
        </header>

        <main className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 mb-8">
            <h2 className="text-3xl font-semibold text-gray-800 dark:text-white mb-6">
              Bem-vindo ao Monorepo
            </h2>

            <div className="space-y-4 text-gray-600 dark:text-gray-300">
              <p className="text-lg">
                Este é um monorepo profissional construído com as melhores práticas de mercado:
              </p>

              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Frontend:</strong> Next.js 15 (App Router) + TypeScript + Tailwind CSS</li>
                <li><strong>Backend:</strong> NestJS + TypeScript</li>
                <li><strong>Validação:</strong> Zod com schemas compartilhados</li>
                <li><strong>Build:</strong> Turborepo para builds otimizados</li>
                <li><strong>Package Manager:</strong> PNPM com workspaces</li>
              </ul>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
            <h3 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">
              Status da API
            </h3>
            <HealthCheck />
          </div>
        </main>

        <footer className="text-center mt-16 text-gray-600 dark:text-gray-400">
          <p>Desenvolvido com ❤️ usando o melhor da stack moderna</p>
        </footer>
      </div>
    </div>
  );
}

