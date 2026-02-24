"use client"

import { Layout } from "@/components/layout";
import { MetricsCard } from "@/components/metrics-card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLicitacoes } from "@/hooks/use-licitacoes";
import { useQuery } from "@tanstack/react-query";
import { fetchUpcomingPrazos, fetchDocuments } from "@/lib/api";
import Link from "next/link";
import {
  BarChart3,
  Clock,
  FileCheck2,
  AlertCircle,
  ArrowRight,
  FileText,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function DashboardPage() {
  const { data: response, isLoading } = useLicitacoes({ limit: 5 });
  const licitacoes = response?.data ?? [];

  const { data: upcomingPrazos = [], isLoading: loadingPrazos } = useQuery({
    queryKey: ["prazos-upcoming", 10],
    queryFn: () => fetchUpcomingPrazos(10),
  })

  const { data: criticalDocsResponse, isLoading: loadingDocs } = useQuery({
    queryKey: ["documents-critical", 10],
    queryFn: () =>
      fetchDocuments({
        limit: 10,
        status: "EXPIRING_SOON",
        expiringDays: 30,
      }),
  })
  const criticalDocs = criticalDocsResponse?.data ?? []

  const totalOpen = licitacoes.filter((l) => l.operationalState === "OK").length
  const totalAtRisk = licitacoes.filter((l) => l.operationalState === "EM_RISCO").length
  const recentLicitacoes = licitacoes.slice(0, 5)

  return (
    <Layout>
      <PageHeader
        breadcrumb={[{ label: "Geral" }]}
        title="Visão Geral"
        subtitle="Visão geral das suas atividades e oportunidades."
        actions={
          <>
            <Button variant="outline">Exportar Relatório</Button>
            <Link href="/licitacoes">
              <Button>Nova Busca</Button>
            </Link>
          </>
        }
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricsCard
          title="Licitações Ativas"
          value={totalOpen}
          description="Com status OK"
          icon={BarChart3}
          variant="default"
        />
        <MetricsCard
          title="Em Risco"
          value={totalAtRisk}
          description="Requer atenção"
          icon={AlertCircle}
          variant="danger"
        />
        <MetricsCard
          title="Analisando"
          value={licitacoes.filter((l) => l.legalStatus === "ANALISANDO").length}
          description="Fase inicial"
          icon={Clock}
          variant="warning"
        />
        <MetricsCard
          title="Vencidas"
          value={licitacoes.filter((l) => l.legalStatus === "VENCIDA").length}
          description="Últimos 30 dias"
          icon={FileCheck2}
          variant="success"
        />
      </div>

      {/* Próximos Prazos + Documentos críticos (lado a lado) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg font-heading text-slate-900">Próximos Prazos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              {loadingPrazos ? (
                [1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-4 items-start pb-4 border-b border-slate-100 last:border-0">
                    <div className="h-14 w-14 bg-slate-100 rounded animate-pulse shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 bg-slate-100 rounded animate-pulse" />
                      <div className="h-3 w-1/2 bg-slate-100 rounded animate-pulse" />
                    </div>
                  </div>
                ))
              ) : upcomingPrazos.length === 0 ? (
                <p className="text-sm text-slate-500 py-2">Nenhum prazo cadastrado.</p>
              ) : (
                upcomingPrazos.slice(0, 5).map((p) => {
                  const d = new Date(p.dataPrazo)
                  const dias = p.diasRestantes ?? 0
                  const label =
                    dias < 0
                      ? `Venceu há ${Math.abs(dias)} ${Math.abs(dias) === 1 ? "dia" : "dias"}`
                      : dias === 0
                        ? "Vence hoje"
                        : `Em ${dias} ${dias === 1 ? "dia" : "dias"}`
                  return (
                    <Link
                      key={p.id}
                      href={`/licitacoes/${p.bidId}/prazos`}
                      className="flex gap-4 items-start pb-4 border-b border-slate-100 last:border-0 last:pb-0 hover:bg-slate-50 -mx-2 px-2 rounded transition-colors"
                    >
                      <div className="bg-slate-50 p-2 rounded text-emerald-600 font-bold text-center min-w-[3.5rem] border border-slate-100 shrink-0">
                        <span className="block text-xs uppercase opacity-70">
                          {format(d, "MMM", { locale: ptBR })}
                        </span>
                        <span className="text-lg">{format(d, "d")}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-sm text-slate-900 line-clamp-1">{p.titulo}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {p.bidTitle ?? "Licitação"} • {format(d, "HH:mm", { locale: ptBR })}
                        </p>
                        <span
                          className={`inline-block mt-1 text-xs font-medium ${
                            dias < 0 ? "text-red-600" : dias <= 7 ? "text-amber-600" : "text-slate-500"
                          }`}
                        >
                          {label}
                        </span>
                      </div>
                    </Link>
                  )
                })
              )}
            </div>
            <Link href="/licitacoes">
              <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white mt-4 font-medium shadow-sm">
                <Calendar className="w-4 h-4 mr-2" />
                Ver Licitações e Prazos
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-500 shrink-0" />
              Documentos críticos
            </CardTitle>
            <span className="text-xs text-slate-500">Vencendo em até 30 dias</span>
          </CardHeader>
          <CardContent>
            {loadingDocs ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                    <div className="h-4 w-48 bg-slate-100 rounded animate-pulse" />
                    <div className="h-4 w-24 bg-slate-100 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : criticalDocs.length === 0 ? (
              <div className="flex flex-col items-center text-center">
                <p className="text-sm text-slate-500 py-4">Nenhum documento vencendo nos próximos 30 dias.</p>
                <Link href="/licitacoes" className="w-full">
                  <Button variant="ghost" size="sm" className="w-full gap-2 text-slate-600">
                    Ver licitações e documentos
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {criticalDocs.slice(0, 8).map((doc) => {
                  const expiresAt = doc.expiresAt ? new Date(doc.expiresAt) : null
                  return (
                    <Link
                      key={doc.id}
                      href={doc.bidId ? `/licitacoes/${doc.bidId}/documentos` : "/licitacoes"}
                      className="flex justify-between items-center py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                    >
                      <span className="font-medium text-sm text-slate-900 truncate max-w-[70%]">
                        {doc.name}
                      </span>
                      {expiresAt && (
                        <span className="text-xs text-amber-600 font-medium shrink-0 ml-2">
                          {format(expiresAt, "dd/MM/yyyy")}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            )}
            {(loadingDocs || criticalDocs.length > 0) && (
              <Link href="/licitacoes" className="block mt-4">
                <Button variant="ghost" size="sm" className="w-full gap-2 text-slate-600">
                  Ver licitações e documentos
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Licitações Recentes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-heading">Licitações Recentes</CardTitle>
          <Link href="/licitacoes">
            <Button variant="ghost" size="sm" className="gap-2 text-slate-500 hover:text-slate-900">
              Ver todas
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Título</TableHead>
                <TableHead>Órgão</TableHead>
                <TableHead>Modalidade</TableHead>
                <TableHead>Status Operacional</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [1, 2, 3].map((i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="h-4 w-32 bg-slate-100 rounded animate-pulse" />
                    </TableCell>
                    <TableCell>
                      <div className="h-4 w-32 bg-slate-100 rounded animate-pulse" />
                    </TableCell>
                    <TableCell>
                      <div className="h-4 w-20 bg-slate-100 rounded animate-pulse" />
                    </TableCell>
                    <TableCell>
                      <div className="h-6 w-16 bg-slate-100 rounded-full animate-pulse" />
                    </TableCell>
                    <TableCell>
                      <div className="h-8 w-20 bg-slate-100 rounded ml-auto animate-pulse" />
                    </TableCell>
                  </TableRow>
                ))
              ) : recentLicitacoes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                    Nenhuma licitação encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                recentLicitacoes.map((item) => (
                  <TableRow key={item.id} className="group">
                    <TableCell className="font-medium text-slate-900">{item.title}</TableCell>
                    <TableCell>{item.agency}</TableCell>
                    <TableCell>{item.modality.replace("_", " ")}</TableCell>
                    <TableCell>
                      <StatusBadge
                        status={item.operationalState === "OK" ? "aberta" : "vencida"}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/licitacoes/${item.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Detalhes
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Layout>
  )
}
