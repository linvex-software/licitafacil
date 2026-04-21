"use client"

import { useAuth } from "@/contexts/auth-context";
import { useLicitacoes } from "@/hooks/use-licitacoes";
import { useBidOverviewStats } from "@/hooks/use-licitacoes";
import { fetchDocuments, fetchUpcomingPrazos, listarPregoesMonitorados } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart2, ArrowRight, FileText, Calendar,
  Plus, ChevronRight, Zap,
} from "lucide-react";
import { listarDisputas, type Disputa } from "@/lib/api";
import { getDisputaListLabel } from "@/lib/disputa-display";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Layout } from "@/components/layout";
import { AuthGuard } from "@/components/AuthGuard";
import { Button } from "@/components/ui/button";

/* ─── KPI Card ──────────────────────────────────────────── */
function KpiCard({
  label, value, sub, accent = "slate", delay = 0, onClick,
}: {
  label: string; value: string | number; sub?: string;
  accent?: "blue" | "red" | "amber" | "emerald" | "slate";
  delay?: number;
  onClick?: () => void;
}) {
  const map = {
    blue: { bar: "bg-foreground", val: "text-foreground" },
    red: { bar: "bg-destructive", val: "text-destructive" },
    amber: { bar: "bg-muted-foreground", val: "text-foreground" },
    emerald: { bar: "bg-foreground/50", val: "text-foreground" },
    slate: { bar: "bg-border", val: "text-muted-foreground" },
  };
  const c = map[accent];

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full cursor-pointer rounded-xl border border-border bg-card p-6 text-left text-card-foreground transition-colors animate-fade-up hover:bg-accent/60"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`mb-4 h-0.5 w-8 rounded-full ${c.bar}`} />
      <p className={`text-4xl font-bold tracking-tight stat-number ${c.val}`}>{value}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{label}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </button>
  );
}

/* ─── Dashboard Page ────────────────────────────────────── */
export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: response, isLoading } = useLicitacoes({ limit: 8 });
  const { data: overviewStats } = useBidOverviewStats();
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

  // Use data local (evita "virar o dia" em UTC e quebrar o filtro por data no backend)
  const hoje = format(new Date(), "yyyy-MM-dd");
  const { data: pregoesHoje = [] } = useQuery({
    queryKey: ["pregoes-hoje", hoje],
    queryFn: () => listarPregoesMonitorados({ data: hoje }),
  });
  const totalPregoesHoje = (pregoesHoje ?? []).filter((p: any) =>
    ["AGUARDANDO", "EM_DISPUTA"].includes(p?.status)
  ).length;

  const { data: disputasAtivas = [] } = useQuery({
    queryKey: ["disputas-ativas-dashboard"],
    queryFn: async () => {
      const list = await listarDisputas({ status: "AO_VIVO" });
      return Array.isArray(list) ? list : [];
    },
    staleTime: 30_000,
  });

  const disputasAoVivo = (disputasAtivas as Disputa[]).filter((d) =>
    ["AO_VIVO", "INICIANDO", "PAUSADA"].includes(d.status)
  );

  const totalOpen = overviewStats?.emAndamento ?? 0;
  const totalAtRisk = overviewStats?.emRisco ?? 0;
  const totalAnalyze = overviewStats?.analisando ?? 0;
  const totalWon = overviewStats?.vencidas ?? 0;

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
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card px-8 py-7 text-card-foreground">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-muted/60 to-transparent dark:from-muted/25" />

            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {formatDate(new Date())}
                </p>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {greeting}, {firstName}.
                </h1>

                <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-muted-foreground opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-muted-foreground" />
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    {totalAtRisk > 0
                      ? `${totalAtRisk} licitaç${totalAtRisk === 1 ? "ão requer" : "ões requerem"} atenção imediata`
                      : "Tudo operacional — sem alertas críticos"}
                  </span>
                </div>
              </div>

              <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:flex sm:items-center sm:gap-3">
                <Button asChild variant="default" size="sm" className="w-full shadow-none sm:w-auto dark:hover:bg-[#e0e0e0]">
                  <Link href="/relatorios" className="inline-flex items-center justify-center gap-2">
                    <BarChart2 className="h-4 w-4" />
                    Relatórios
                  </Link>
                </Button>
                <Button asChild variant="default" size="sm" className="w-full shadow-none sm:w-auto dark:hover:bg-[#e0e0e0]">
                  <Link href="/licitacoes" className="inline-flex items-center justify-center gap-2">
                    <Plus className="h-4 w-4" />
                    Nova Licitação
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* ── KPI Strip ───────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
            <KpiCard
              label="Ativas"
              value={totalOpen}
              sub="Operacionais"
              accent="blue"
              delay={0}
              onClick={() => router.push("/licitacoes?status=ATIVA")}
            />
            <KpiCard
              label="Em Risco"
              value={totalAtRisk}
              sub="Requer ação"
              accent={totalAtRisk > 0 ? "red" : "slate"}
              delay={60}
              onClick={() => router.push("/licitacoes?status=EM_RISCO")}
            />
            <KpiCard
              label="Analisando"
              value={totalAnalyze}
              sub="Fase inicial"
              accent="amber"
              delay={120}
              onClick={() => router.push("/licitacoes?status=ANALISANDO")}
            />
            <KpiCard
              label="Vencidas"
              value={totalWon}
              sub="Licitações ganhas"
              accent="emerald"
              delay={180}
              onClick={() => router.push("/licitacoes?status=VENCIDA")}
            />
          </div>

          {/* ── Main grid ───────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

            {/* Pregões hoje */}
            <div
              className="animate-fade-up rounded-xl border border-border bg-card p-5 text-card-foreground lg:col-span-5"
              style={{ animationDelay: "80ms" }}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="section-label">
                    Pregões hoje
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {totalPregoesHoje} pregão(ões) em andamento ou aguardando
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Acompanhe em tempo real
                  </p>
                </div>
                <Button asChild variant="default" size="sm" className="shadow-none dark:hover:bg-[#e0e0e0]">
                  <Link href="/monitoramento" className="inline-flex items-center justify-center gap-2">
                    Ver monitoramento
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* Disputas ao vivo */}
            <div
              className="animate-fade-up rounded-xl border border-border bg-card p-5 text-card-foreground lg:col-span-5"
              style={{ animationDelay: "90ms" }}
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="section-label">
                  Disputas ativas
                </h2>
                {disputasAoVivo.length > 0 && (
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive/60 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
                  </span>
                )}
              </div>
              {disputasAoVivo.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhuma disputa em andamento</p>
              ) : (
                <div className="space-y-2">
                  {disputasAoVivo.map((d) => (
                    <Link
                      key={d.id}
                      href={`/disputa/${d.id}/ao-vivo`}
                      className="flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-accent/50"
                    >
                      <span className="max-w-[220px] truncate text-sm text-foreground">
                        {getDisputaListLabel(d)}
                      </span>
                      <span className="animate-pulse rounded px-2 py-0.5 text-xs font-medium bg-destructive/15 text-destructive">
                        AO VIVO
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Prazos */}
            <div className="animate-fade-up rounded-xl border border-border bg-card p-5 text-card-foreground lg:col-span-3"
              style={{ animationDelay: "100ms" }}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="section-label">
                  Próximos Prazos
                </h2>
                <Link href="/licitacoes" className="flex items-center gap-1 text-xs font-semibold text-foreground underline-offset-4 hover:underline">
                  Todos os prazos
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="divide-y divide-border">
                {loadingPrazos ? (
                  [1, 2, 3].map(i => (
                    <div key={i} className="flex gap-4 items-center py-3.5">
                      <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-2/3 animate-pulse rounded-full bg-muted" />
                        <div className="h-3 w-1/2 animate-pulse rounded-full bg-muted" />
                      </div>
                    </div>
                  ))
                ) : upcomingPrazos.filter((p) => (p.diasRestantes ?? 0) >= 0).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="mb-3 rounded-full bg-muted p-3 ring-1 ring-border">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      Nenhum prazo cadastrado
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Adicione prazos nas suas licitações ativas
                    </p>
                    <Link href="/licitacoes" className="mt-3 text-xs font-semibold text-foreground underline-offset-4 hover:underline">
                      Ver licitações →
                    </Link>
                  </div>
                ) : (
                  upcomingPrazos
                    .filter((p) => (p.diasRestantes ?? 0) >= 0)
                    .slice(0, 6)
                    .map((p) => {
                    const d = new Date(p.dataPrazo);
                    const dias = p.diasRestantes ?? 0;
                    const isUrgent = dias >= 0 && dias <= 3;
                    const isPast = dias < 0;
                    return (
                      <Link key={p.id} href={`/licitacoes/${p.bidId}/prazos`}
                        className="group flex items-center gap-4 rounded-lg px-3 py-3.5 transition-colors hover:bg-accent/50">
                        <div className={`shrink-0 w-11 text-center rounded-xl py-1.5 border ${isPast ? "border-destructive/50 bg-destructive/10" :
                          isUrgent ? "border-border bg-muted" :
                            "border-border bg-muted"
                          }`}>
                          <p className={`text-[9px] font-bold uppercase tracking-wider ${isPast ? "text-destructive" : "text-muted-foreground"}`}>
                            {format(d, "MMM", { locale: ptBR })}
                          </p>
                          <p className={`mt-0.5 text-[16px] font-bold leading-none ${isPast ? "text-destructive" : "text-foreground"
                            }`}>
                            {format(d, "d")}
                          </p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-[13px] font-semibold text-foreground transition-colors group-hover:text-muted-foreground">{p.titulo}</p>
                          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{p.bidTitle || "Licitação"}</p>
                        </div>
                        <span className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full border ${isPast
                          ? "border-destructive/50 bg-destructive/10 text-destructive"
                          : isUrgent
                            ? "border-border bg-muted text-foreground"
                            : "border-border bg-muted text-muted-foreground"
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
            <div className="animate-fade-up rounded-xl border border-border bg-card p-5 text-card-foreground lg:col-span-2"
              style={{ animationDelay: "160ms" }}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="section-label">
                  Docs Vencendo
                </h2>
                <Link href="/documentos" className="flex items-center gap-1 text-xs font-semibold text-foreground underline-offset-4 hover:underline">
                  Ver todos
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="divide-y divide-border">
                {criticalDocs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="mb-3 rounded-full bg-muted p-3 ring-1 ring-border">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      Sem documentos críticos
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Nenhum documento vence nos próximos 30 dias
                    </p>
                    <Link href="/documentos" className="mt-3 text-xs font-semibold text-foreground underline-offset-4 hover:underline">
                      Gerenciar documentos →
                    </Link>
                  </div>
                ) : (
                  criticalDocs.slice(0, 5).map(doc => {
                    const exp = doc.expiresAt ? new Date(doc.expiresAt) : null;
                    return (
                      <Link key={doc.id} href={doc.bidId ? `/licitacoes/${doc.bidId}/documentos` : "/documentos"}
                        className="group flex items-center gap-3 rounded-lg px-3 py-3.5 transition-colors hover:bg-accent/50">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
                          <FileText className="h-3.5 w-3.5 text-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-[13px] font-medium text-foreground transition-colors group-hover:text-muted-foreground">{doc.name}</p>
                          {exp && <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">{format(exp, "dd/MM/yyyy")}</p>}
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
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
              <h2 className="section-label">
                Licitações Recentes
              </h2>
              <Link href="/licitacoes" className="flex items-center gap-1 text-xs font-semibold text-foreground underline-offset-4 hover:underline">
                Ver todos
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="rounded-xl border border-border bg-card p-5 text-card-foreground">
              {isLoading ? (
                <div className="divide-y divide-border">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-4 py-4">
                      <div className="h-4 w-48 animate-pulse rounded-full bg-muted" />
                      <div className="ml-auto h-5 w-16 animate-pulse rounded-full bg-muted" />
                    </div>
                  ))}
                </div>
              ) : licitacoes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="mb-3 rounded-full bg-muted p-3 ring-1 ring-border">
                    <Zap className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    Nenhuma licitação encontrada
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Cadastre sua primeira licitação para começar
                  </p>
                  <Link href="/licitacoes" className="mt-3 text-xs font-semibold text-foreground underline-offset-4 hover:underline">
                    Ir para licitações →
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {licitacoes.slice(0, 6).map((item, idx) => (
                    <Link key={item.id} href={`/licitacoes/${item.id}`}
                      className="group flex cursor-pointer items-center gap-4 rounded-lg px-3 py-3.5 transition-colors hover:bg-accent/50">
                      <span className="stat-number w-6 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.agency}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="hidden rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground md:inline-flex">
                          {modalidadeLabel[item.modality] ?? item.modality.replace(/_/g, " ")}
                        </span>
                        {item.operationalState === "OK" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-semibold text-foreground">
                            <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
                            Ativa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-destructive/40 bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive">
                            <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                            Em risco
                          </span>
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Link>
                  ))}
                  <Link href="/licitacoes"
                    className="flex items-center justify-center gap-1.5 rounded-lg py-3.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground">
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
