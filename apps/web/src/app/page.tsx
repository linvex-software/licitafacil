"use client"

import { useAuth } from "@/contexts/auth-context";
import { useLicitacoes } from "@/hooks/use-licitacoes";
import { fetchDocuments, fetchUpcomingPrazos } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  BarChart3, ArrowRight, FileText, Calendar,
  Activity, Plus, ChevronRight, Zap,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
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
    blue: { bar: "bg-blue-500", val: "text-blue-700 dark:text-blue-400" },
    red: { bar: "bg-red-500", val: "text-red-700 dark:text-red-400" },
    amber: { bar: "bg-amber-400", val: "text-amber-700 dark:text-amber-400" },
    emerald: { bar: "bg-emerald-500", val: "text-emerald-700 dark:text-emerald-400" },
    slate: { bar: "bg-gray-300 dark:bg-gray-600", val: "text-gray-700 dark:text-gray-300" },
  };
  const c = map[accent];

  return (
    <div
      className="bg-white dark:bg-gray-900 rounded-xl px-5 pt-5 pb-4 animate-fade-up border border-gray-100 dark:border-gray-800"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`h-[3px] w-10 rounded-full ${c.bar} mb-4`} />
      <p className={`text-[30px] font-bold leading-none stat-number ${c.val}`}>{value}</p>
      <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mt-2">{label}</p>
      {sub && <p className="text-[12px] text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

/* ─── Section Header ────────────────────────────────────── */
function SectionHeader({ title, href, linkLabel }: { title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-[12px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{title}</h2>
      {href && (
        <Link href={href} className="text-[12px] text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-0.5 font-medium transition-colors">
          {linkLabel || "Ver todos"}
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      )}
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

  return (
    <AuthGuard>
      <Layout>
        <div className="page-enter space-y-7">

          {/* ── Hero ────────────────────────────────────────── */}
          <div
            className="rounded-2xl px-7 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5"
            style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #3b82f6 100%)" }}
          >
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-blue-200 mb-1">
                {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </p>
              <h1 className="text-[22px] font-bold text-white leading-tight">
                {greeting}, {firstName}. 👋
              </h1>
              <p className="text-[13px] text-blue-200 mt-1">
                {totalAtRisk > 0
                  ? <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-amber-300" />{totalAtRisk} licitaç{totalAtRisk === 1 ? "ão requer" : "ões requerem"} atenção imediata</span>
                  : "Tudo operacional — sem alertas críticos ✓"}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link href="/relatorios">
                <Button variant="outline" size="sm"
                  className="rounded-full gap-1.5 bg-white text-gray-700 border-white hover:bg-gray-50 hover:text-gray-900 shadow-sm">
                  <BarChart3 className="w-3.5 h-3.5" />
                  Relatórios
                </Button>
              </Link>
              <Link href="/licitacoes">
                <Button size="sm"
                  className="rounded-full gap-1.5 bg-white text-blue-700 hover:bg-blue-50 shadow-md hover:shadow-lg">
                  <Plus className="w-3.5 h-3.5" />
                  Nova Licitação
                </Button>
              </Link>
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
            <div className="lg:col-span-3 bg-white dark:bg-gray-900 rounded-xl animate-fade-up overflow-hidden border border-gray-100 dark:border-gray-800"
              style={{ animationDelay: "100ms" }}>
              <div className="px-5 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800">
                <SectionHeader title="Próximos Prazos" href="/licitacoes" linkLabel="Todos os prazos" />
              </div>
              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                {loadingPrazos ? (
                  [1, 2, 3].map(i => (
                    <div key={i} className="flex gap-4 items-center px-5 py-3.5">
                      <div className="h-10 w-10 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-2/3 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse" />
                        <div className="h-3 w-1/2 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse" />
                      </div>
                    </div>
                  ))
                ) : upcomingPrazos.length === 0 ? (
                  <div className="px-5 py-12 flex flex-col items-center gap-2 text-center">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center mb-1 border border-gray-100 dark:border-gray-700">
                      <Calendar className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                    </div>
                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Sem prazos próximos</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">Adicione prazos nas suas licitações</p>
                  </div>
                ) : (
                  upcomingPrazos.slice(0, 6).map((p) => {
                    const d = new Date(p.dataPrazo);
                    const dias = p.diasRestantes ?? 0;
                    const isUrgent = dias >= 0 && dias <= 3;
                    const isPast = dias < 0;
                    return (
                      <Link key={p.id} href={`/licitacoes/${p.bidId}/prazos`}
                        className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
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
                          <p className="text-[13px] font-semibold text-gray-800 dark:text-gray-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{p.titulo}</p>
                          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">{p.bidTitle || "Licitação"}</p>
                        </div>
                        <span className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full border ${isPast
                          ? "bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800"
                          : isUrgent
                            ? "bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                            : "bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700"
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
            <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-xl animate-fade-up overflow-hidden border border-gray-100 dark:border-gray-800"
              style={{ animationDelay: "160ms" }}>
              <div className="px-5 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800">
                <SectionHeader title="Docs Vencendo" href="/documentos" linkLabel="Ver todos" />
                <p className="text-[11px] text-gray-400 dark:text-gray-500 -mt-2">Próximos 30 dias</p>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                {criticalDocs.length === 0 ? (
                  <div className="px-5 py-12 flex flex-col items-center gap-2 text-center">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center mb-1 border border-gray-100 dark:border-gray-700">
                      <FileText className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                    </div>
                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Sem documentos críticos</p>
                  </div>
                ) : (
                  criticalDocs.slice(0, 5).map(doc => {
                    const exp = doc.expiresAt ? new Date(doc.expiresAt) : null;
                    return (
                      <Link key={doc.id} href={doc.bidId ? `/licitacoes/${doc.bidId}/documentos` : "/documentos"}
                        className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                        <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950 flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-800">
                          <FileText className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-gray-700 dark:text-gray-300 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{doc.name}</p>
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
            <SectionHeader title="Licitações Recentes" href="/licitacoes" />
            <div className="bg-white dark:bg-gray-900 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800">
              {isLoading ? (
                <div className="divide-y divide-gray-50 dark:divide-gray-800">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-4 px-5 py-4">
                      <div className="h-4 w-48 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse" />
                      <div className="ml-auto h-5 w-16 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : licitacoes.length === 0 ? (
                <div className="py-14 flex flex-col items-center gap-3 text-center">
                  <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950 rounded-2xl flex items-center justify-center border border-blue-100 dark:border-blue-900">
                    <Activity className="w-6 h-6 text-blue-500 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700 dark:text-gray-300">Nenhuma licitação</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Adicione sua primeira licitação para começar</p>
                  </div>
                  <Link href="/licitacoes">
                    <Button size="sm" className="rounded-full mt-1 gap-1.5">
                      <Plus className="w-3.5 h-3.5" />
                      Nova Licitação
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-gray-50 dark:divide-gray-800">
                  {licitacoes.slice(0, 6).map((item, idx) => (
                    <Link key={item.id} href={`/licitacoes/${item.id}`}
                      className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                      <span className="text-[11px] font-bold text-gray-300 dark:text-gray-600 w-5 shrink-0 stat-number tabular-nums">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-gray-800 dark:text-gray-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{item.title}</p>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">{item.agency}</p>
                      </div>
                      <span className="hidden md:block text-[11px] text-gray-400 dark:text-gray-500 shrink-0 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 px-2 py-0.5 rounded-full">
                        {item.modality.replace(/_/g, " ")}
                      </span>
                      <div className="shrink-0">
                        <StatusBadge status={item.operationalState === "OK" ? "aberta" : "vencida"} />
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 shrink-0" />
                    </Link>
                  ))}
                  <Link href="/licitacoes"
                    className="flex items-center justify-center gap-1.5 py-3.5 text-[12px] font-medium text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
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
