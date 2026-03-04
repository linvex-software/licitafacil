"use client"

import { useAuth } from "@/contexts/auth-context";
import { useLicitacoes } from "@/hooks/use-licitacoes";
import { fetchDocuments, fetchUpcomingPrazos } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  BarChart2, ArrowRight, FileText, Calendar,
  Plus, ChevronRight, Zap,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Layout } from "@/components/layout";
import { AuthGuard } from "@/components/AuthGuard";

/* ─── KPI Card ──────────────────────────────────────────── */
function KpiCard({
  label, value, sub, accent = "slate", delay = 0,
}: {
  label: string; value: string | number; sub?: string;
  accent?: "blue" | "red" | "amber" | "emerald" | "slate";
  delay?: number;
}) {
  const map = {
    blue: { bar: "bg-[#0078D1]", val: "text-[#0078D1] dark:text-[#66b1e7]" },
    red: { bar: "bg-red-500", val: "text-red-700 dark:text-red-400" },
    amber: { bar: "bg-amber-400", val: "text-amber-700 dark:text-amber-400" },
    emerald: { bar: "bg-emerald-500", val: "text-emerald-700 dark:text-emerald-400" },
    slate: { bar: "bg-gray-300 dark:bg-gray-600", val: "text-gray-700 dark:text-gray-300" },
  };
  const c = map[accent];

  return (
    <div
      className="rounded-xl border border-gray-100 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 animate-fade-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`mb-4 h-0.5 w-8 rounded-full ${c.bar}`} />
      <p className={`text-4xl font-bold tracking-tight stat-number ${c.val}`}>{value}</p>
      <p className="mt-1 text-sm font-semibold text-gray-700 dark:text-gray-200">{label}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500">{sub}</p>}
    </div>
  );
}

/* ─── Dashboard Page ────────────────────────────────────── */
export default function DashboardPage() {
  const { user } = useAuth();
  const { data: response, isLoading } = useLicitacoes({ limit: 8 });
  const licitacoes = response?.data ?? [];

  const { data: upcomingPrazos = [], isLoading: loadingPrazos } = useQuery({
    queryKey: ["prazos-upcoming", 8],
    queryFn: () => fetchUpcomingPrazos(8),
  });

  const { data: criticalDocsResponse } = useQuery({
    queryKey: ["documents-critical"],
    queryFn: () => fetchDocuments({ limit: 6, status: "EXPIRING_SOON", expiringDays: 30 }),
  });
  const criticalDocs = criticalDocsResponse?.data ?? [];

  const totalOpen = licitacoes.filter(l => l.operationalState === "OK").length;
  const totalAtRisk = licitacoes.filter(l => l.operationalState === "EM_RISCO").length;
  const totalAnalyze = licitacoes.filter(l => l.legalStatus === "ANALISANDO").length;
  const totalWon = licitacoes.filter(l => l.legalStatus === "VENCIDA").length;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const firstName = user?.name?.split(" ")[0] || "usuário";
  const formatDate = (date: Date) => {
    const raw = format(date, "EEEE, dd 'de' MMMM", { locale: ptBR });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  };
  const modalidadeLabel: Record<string, string> = {
    PREGAO_ELETRONICO: "Pregão",
    "PREGAO ELETRONICO": "Pregão",
    DISPENSA: "Dispensa",
    CONCORRENCIA: "Concorrência",
    TOMADA_DE_PRECOS: "Tomada de Preços",
    CONVITE: "Convite",
  };

  return (
    <AuthGuard>
      <Layout>
        <div className="page-enter space-y-7">

          {/* ── Hero ────────────────────────────────────────── */}
          <div className="relative overflow-hidden rounded-2xl bg-[#0078D1] px-8 py-7">
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M 40 0 L 0 0 0 40' fill='none' stroke='white' stroke-width='0.8'/%3E%3C/svg%3E\")",
              }}
            />

            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-white/50">
                  {formatDate(new Date())}
                </p>
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  {greeting}, {firstName}.
                </h1>

                <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 backdrop-blur-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                  </span>
                  <span className="text-xs font-medium text-white/80">
                    {totalAtRisk > 0
                      ? `${totalAtRisk} licitaç${totalAtRisk === 1 ? "ão requer" : "ões requerem"} atenção imediata`
                      : "Tudo operacional — sem alertas críticos"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link href="/relatorios">
                  <button className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#0078D1] transition-colors hover:bg-white/90">
                    <BarChart2 className="h-4 w-4" />
                    Relatórios
                  </button>
                </Link>
                <Link href="/licitacoes">
                  <button className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#0078D1] transition-colors hover:bg-white/90">
                    <Plus className="h-4 w-4" />
                    Nova Licitação
                  </button>
                </Link>
              </div>
            </div>
          </div>

          {/* ── KPI Strip ───────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
            <KpiCard label="Ativas" value={totalOpen} sub="Operacionais" accent="blue" delay={0} />
            <KpiCard label="Em Risco" value={totalAtRisk} sub="Requer ação" accent={totalAtRisk > 0 ? "red" : "slate"} delay={60} />
            <KpiCard label="Analisando" value={totalAnalyze} sub="Fase inicial" accent="amber" delay={120} />
            <KpiCard label="Vencidas" value={totalWon} sub="Licitações ganhas" accent="emerald" delay={180} />
          </div>

          {/* ── Main grid ───────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

            {/* Prazos */}
            <div className="lg:col-span-3 rounded-xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 animate-fade-up"
              style={{ animationDelay: "100ms" }}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                  Próximos Prazos
                </h2>
                <Link href="/licitacoes" className="flex items-center gap-1 text-xs font-semibold text-[#0078D1] hover:underline">
                  Todos os prazos
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                {loadingPrazos ? (
                  [1, 2, 3].map(i => (
                    <div key={i} className="flex gap-4 items-center py-3.5">
                      <div className="h-10 w-10 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-2/3 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse" />
                        <div className="h-3 w-1/2 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse" />
                      </div>
                    </div>
                  ))
                ) : upcomingPrazos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="mb-3 rounded-full bg-gray-100 p-3 dark:bg-gray-800">
                      <Calendar className="h-5 w-5 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Nenhum prazo cadastrado
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                      Adicione prazos nas suas licitações ativas
                    </p>
                    <Link href="/licitacoes" className="mt-3 text-xs font-semibold text-[#0078D1] hover:underline">
                      Ver licitações →
                    </Link>
                  </div>
                ) : (
                  upcomingPrazos.slice(0, 6).map((p) => {
                    const d = new Date(p.dataPrazo);
                    const dias = p.diasRestantes ?? 0;
                    const isUrgent = dias >= 0 && dias <= 3;
                    const isPast = dias < 0;
                    return (
                      <Link key={p.id} href={`/licitacoes/${p.bidId}/prazos`}
                        className="flex items-center gap-4 rounded-lg px-3 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                        <div className={`shrink-0 w-11 text-center rounded-xl py-1.5 border ${isPast ? "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800" :
                          isUrgent ? "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800" :
                            "bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700"
                          }`}>
                          <p className={`text-[9px] font-bold uppercase tracking-wider ${isPast ? "text-red-400" : "text-gray-400 dark:text-gray-500"}`}>
                            {format(d, "MMM", { locale: ptBR })}
                          </p>
                          <p className={`text-[16px] font-bold leading-none mt-0.5 ${isPast ? "text-red-600 dark:text-red-400" : isUrgent ? "text-amber-600 dark:text-amber-400" : "text-gray-700 dark:text-gray-300"
                            }`}>
                            {format(d, "d")}
                          </p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-gray-800 dark:text-gray-200 truncate group-hover:text-primary dark:group-hover:text-primary-300 transition-colors">{p.titulo}</p>
                          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">{p.bidTitle || "Licitação"}</p>
                        </div>
                        <span className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full border ${isPast
                          ? "bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800"
                          : isUrgent
                            ? "bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                            : "bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-800"
                          }`}>
                          {isPast ? `−${Math.abs(dias)}d` : dias === 0 ? "Hoje" : `+${dias}d`}
                        </span>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>

            {/* Docs críticos */}
            <div className="lg:col-span-2 rounded-xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 animate-fade-up"
              style={{ animationDelay: "160ms" }}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                  Docs Vencendo
                </h2>
                <Link href="/documentos" className="flex items-center gap-1 text-xs font-semibold text-[#0078D1] hover:underline">
                  Ver todos
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                {criticalDocs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="mb-3 rounded-full bg-gray-100 p-3 dark:bg-gray-800">
                      <FileText className="h-5 w-5 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Sem documentos críticos
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                      Nenhum documento vence nos próximos 30 dias
                    </p>
                    <Link href="/documentos" className="mt-3 text-xs font-semibold text-[#0078D1] hover:underline">
                      Gerenciar documentos →
                    </Link>
                  </div>
                ) : (
                  criticalDocs.slice(0, 5).map(doc => {
                    const exp = doc.expiresAt ? new Date(doc.expiresAt) : null;
                    return (
                      <Link key={doc.id} href={doc.bidId ? `/licitacoes/${doc.bidId}/documentos` : "/documentos"}
                        className="flex items-center gap-3 rounded-lg px-3 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                        <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950 flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-800">
                          <FileText className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-gray-700 dark:text-gray-300 truncate group-hover:text-primary dark:group-hover:text-primary-300 transition-colors">{doc.name}</p>
                          {exp && <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">{format(exp, "dd/MM/yyyy")}</p>}
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 shrink-0" />
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* ── Recent Bids ─────────────────────────────────── */}
          <div className="animate-fade-up" style={{ animationDelay: "220ms" }}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                Licitações Recentes
              </h2>
              <Link href="/licitacoes" className="flex items-center gap-1 text-xs font-semibold text-[#0078D1] hover:underline">
                Ver todos
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              {isLoading ? (
                <div className="divide-y divide-gray-50 dark:divide-gray-800">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-4 py-4">
                      <div className="h-4 w-48 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse" />
                      <div className="ml-auto h-5 w-16 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : licitacoes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="mb-3 rounded-full bg-gray-100 p-3 dark:bg-gray-800">
                    <Zap className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Nenhuma licitação encontrada
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                    Cadastre sua primeira licitação para começar
                  </p>
                  <Link href="/licitacoes" className="mt-3 text-xs font-semibold text-[#0078D1] hover:underline">
                    Ir para licitações →
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-gray-50 dark:divide-gray-800">
                  {licitacoes.slice(0, 6).map((item, idx) => (
                    <Link key={item.id} href={`/licitacoes/${item.id}`}
                      className="flex items-center gap-4 rounded-lg px-3 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer group">
                      <span className="w-6 shrink-0 text-xs font-mono text-gray-300 dark:text-gray-600 stat-number tabular-nums">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">{item.title}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{item.agency}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="hidden md:inline-flex rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-600 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-400">
                          {modalidadeLabel[item.modality] ?? item.modality.replace(/_/g, " ")}
                        </span>
                        {item.operationalState === "OK" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Ativa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                            Em risco
                          </span>
                        )}
                        <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600" />
                      </div>
                    </Link>
                  ))}
                  <Link href="/licitacoes"
                    className="flex items-center justify-center gap-1.5 py-3.5 text-[12px] font-medium text-gray-400 dark:text-gray-500 hover:text-primary dark:hover:text-primary-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors rounded-lg">
                    Ver todas as licitações
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </Layout>
    </AuthGuard>
  );
}
