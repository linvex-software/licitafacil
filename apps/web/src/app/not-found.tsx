import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <div className="mb-8">
        <span className="text-4xl font-bold tracking-tight">
          <span className="text-primary">LVX</span>
          <span className="text-foreground">LICITAÇÃO</span>
        </span>
      </div>

      <div className="max-w-md space-y-4">
        <h1 className="text-8xl font-bold text-primary">404</h1>
        <h2 className="text-2xl font-semibold text-foreground">
          Página não encontrada
        </h2>
        <p className="text-muted-foreground">
          A página que você está procurando não existe ou foi removida.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors mt-4"
        >
          ← Voltar ao Dashboard
        </Link>
      </div>

      <p className="mt-12 text-xs text-muted-foreground">
        Limvex Licitação — Gestão inteligente de processos licitatórios
      </p>
    </div>
  )
}
