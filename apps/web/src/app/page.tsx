"use client"

import { Layout } from "@/components/layout";
import { MetricsCard } from "@/components/metrics-card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLicitacoes } from "@/hooks/use-licitacoes";
import Link from "next/link";
import {
  BarChart3,
  Clock,
  FileCheck2,
  AlertCircle,
  ArrowRight,
  TrendingUp
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

const chartData = [
  { name: 'Jan', value: 12 },
  { name: 'Fev', value: 18 },
  { name: 'Mar', value: 8 },
  { name: 'Abr', value: 24 },
  { name: 'Mai', value: 16 },
  { name: 'Jun', value: 20 },
];

export default function DashboardPage() {
  const { data: response, isLoading } = useLicitacoes({ limit: 5 });
  const licitacoes = response?.data || [];

  // Simple metric calculations
  const totalOpen = licitacoes.filter(l => l.operationalState === 'OK').length;
  const totalAtRisk = licitacoes.filter(l => l.operationalState === 'EM_RISCO').length;

  const recentLicitacoes = licitacoes.slice(0, 5);

  return (
    <Layout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">Visão geral das suas atividades e oportunidades.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">Exportar Relatório</Button>
          <Link href="/licitacoes">
            <Button className="bg-slate-900 hover:bg-slate-800 text-white">
              Nova Busca
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricsCard
          title="Licitações Ativas"
          value={totalOpen}
          description="+12% que mês passado"
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
          value={licitacoes.filter(l => l.legalStatus === 'ANALISANDO').length}
          description="Fase inicial"
          icon={Clock}
          variant="warning"
        />
        <MetricsCard
          title="Vencidas"
          value={licitacoes.filter(l => l.legalStatus === 'VENCIDA').length}
          description="Últimos 30 dias"
          icon={FileCheck2}
          variant="success"
        />
      </div>

      {/* Charts & Content Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Column */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              Volume de Oportunidades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}`}
                  />
                  <Tooltip
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="value" fill="#0f172a" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions / Notifications Mock */}
        <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg font-heading text-slate-900">Próximos Prazos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4 items-start pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                  <div className="bg-slate-50 p-2 rounded text-emerald-600 font-bold text-center min-w-[3.5rem] border border-slate-100">
                    <span className="block text-xs uppercase opacity-70">Mai</span>
                    <span className="text-lg">2{i}</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-slate-900 line-clamp-1">Aquisição de Equipamentos de TI</h4>
                    <p className="text-xs text-slate-500 mt-1">Prefeitura de São Paulo • 14:00h</p>
                  </div>
                </div>
              ))}
            </div>

            <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white mt-4 font-medium shadow-sm">
              Ver Calendário Completo
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-heading">Licitações Recentes</CardTitle>
          <Link href="/licitacoes">
            <Button variant="ghost" size="sm" className="gap-2 text-slate-500 hover:text-slate-900">
              Ver todas <ArrowRight className="w-4 h-4" />
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
                    <TableCell><div className="h-4 w-32 bg-slate-100 rounded animate-pulse" /></TableCell>
                    <TableCell><div className="h-4 w-32 bg-slate-100 rounded animate-pulse" /></TableCell>
                    <TableCell><div className="h-4 w-20 bg-slate-100 rounded animate-pulse" /></TableCell>
                    <TableCell><div className="h-6 w-16 bg-slate-100 rounded-full animate-pulse" /></TableCell>
                    <TableCell><div className="h-8 w-20 bg-slate-100 rounded ml-auto animate-pulse" /></TableCell>
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
                    <TableCell>{item.modality.replace('_', ' ')}</TableCell>
                    <TableCell>
                      <StatusBadge status={item.operationalState === 'OK' ? 'aberta' : 'vencida'} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/licitacoes/${item.id}`}>
                        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
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
  );
}
