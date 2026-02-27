"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/Badge";
import { Plus, Search, Download, Users, DollarSign, TrendingDown } from "lucide-react";
import { CriarClienteModal } from "@/components/admin/criar-cliente-modal";
import { api } from "@/lib/api";
import { formatCurrency, formatCNPJ, formatDate } from "@/lib/utils";
import { Layout } from "@/components/layout";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "@/hooks/use-toast";

interface ClienteConfig {
  id: string;
  empresaId: string;
  cnpj: string;
  email: string;
  plano: "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
  status: "ATIVO" | "SUSPENSO" | "CANCELADO" | "TRIAL";
  mensalidade: number;
  valorSetup: number;
  dataInicio: string;
  createdAt: string;
  empresa: {
    id: string;
    name: string;
    users: Array<{
      id: string;
      name: string;
      email: string;
      role: string;
      createdAt: string;
    }>;
    _count: {
      users: number;
      bids: number;
    };
  };
}

interface Estatisticas {
  totalClientes: number;
  clientesAtivos: number;
  clientesSuspensos: number;
  mrr: number;
  arr: number;
  setupTotal: number;
  churnRate: number;
}

export default function PainelAdminClientes() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [clientes, setClientes] = useState<ClienteConfig[]>([]);
  const [estatisticas, setEstatisticas] = useState<Estatisticas | null>(null);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [modalAberto, setModalAberto] = useState(false);

  // Proteção de rota: apenas SUPER_ADMIN pode acessar
  useEffect(() => {
    if (!authLoading && user && user.role !== "SUPER_ADMIN") {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para acessar esta área",
        variant: "destructive",
      });
      router.push("/");
    }
  }, [user, authLoading, router]);

  const carregarDados = useCallback(async () => {
    try {
      const [clientesRes, statsRes] = await Promise.all([
        api.get("/admin/clientes"),
        api.get("/admin/clientes/estatisticas"),
      ]);
      setClientes(clientesRes.data);
      setEstatisticas(statsRes.data);
    } catch (error: unknown) {
      // Se backend retornar 403, redirecionar
      const asRecord = error as Record<string, { status?: number }>;
      if (asRecord?.response?.status === 403) {
        toast({
          title: "Acesso negado",
          description: "Você não tem permissão para acessar esta área",
          variant: "destructive",
        });
        router.push("/");
        return;
      }
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    // Só carregar dados se for SUPER_ADMIN
    if (!authLoading && user?.role === "SUPER_ADMIN") {
      carregarDados();
    }
  }, [carregarDados, user, authLoading]);

  const exportarCSV = () => {
    const csvContent = [
      ["Empresa", "CNPJ", "Plano", "Status", "Mensalidade", "Usuários", "Licitações", "Data Início"],
      ...clientes.map((c) => [
        c.empresa.name,
        formatCNPJ(c.cnpj),
        c.plano,
        c.status,
        String(c.mensalidade),
        String(c.empresa._count.users),
        String(c.empresa._count.bids),
        formatDate(c.dataInicio),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `clientes_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const clientesFiltrados = clientes.filter(
    (c) =>
      c.empresa.name.toLowerCase().includes(busca.toLowerCase()) ||
      c.cnpj.replace(/\D/g, "").includes(busca.replace(/\D/g, "")),
  );

  const badgeStatusVariant = (status: string) => {
    const variants: Record<string, string> = {
      ATIVO: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800",
      SUSPENSO: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
      CANCELADO: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800",
      TRIAL: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    };
    return variants[status] || "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300";
  };

  const badgePlanoVariant = (plano: string) => {
    const variants: Record<string, string> = {
      STARTER: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700",
      PROFESSIONAL: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800",
      ENTERPRISE: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800",
    };
    return variants[plano] || "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300";
  };

  // Enquanto verifica auth ou se não é SUPER_ADMIN
  if (authLoading || !user || user.role !== "SUPER_ADMIN") {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-muted-foreground text-lg">Verificando permissões...</div>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-muted-foreground text-lg">Carregando painel admin...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Gerenciar Clientes
            </h1>
            <p className="text-muted-foreground mt-1">
              Painel administrativo B2B — Limvex Licitação
            </p>
          </div>
          <Button onClick={() => setModalAberto(true)} size="lg">
            <Plus className="mr-2 h-4 w-4" />
            Novo Cliente
          </Button>
        </div>

        {/* Cards de Estatísticas */}
        {estatisticas && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{estatisticas.totalClientes}</div>
                <p className="text-xs text-muted-foreground">
                  {estatisticas.clientesAtivos} ativos · {estatisticas.clientesSuspensos} suspensos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">MRR</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(estatisticas.mrr)}</div>
                <p className="text-xs text-muted-foreground">
                  ARR: {formatCurrency(estatisticas.arr)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{estatisticas.churnRate}%</div>
                <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {estatisticas.clientesAtivos > 0
                    ? formatCurrency(estatisticas.mrr / estatisticas.clientesAtivos)
                    : "R$ 0,00"}
                </div>
                <p className="text-xs text-muted-foreground">Mensalidade média por cliente ativo</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabela de Clientes */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou CNPJ..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" onClick={exportarCSV} disabled={clientes.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead className="text-center">Usuários</TableHead>
                  <TableHead className="text-center">Licitações</TableHead>
                  <TableHead>Mensalidade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Início</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientesFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      {busca
                        ? "Nenhum cliente encontrado para essa busca"
                        : "Nenhum cliente cadastrado. Clique em \"Novo Cliente\" para começar."}
                    </TableCell>
                  </TableRow>
                ) : (
                  clientesFiltrados.map((cliente) => (
                    <TableRow
                      key={cliente.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => router.push(`/admin/clientes/${cliente.empresaId}`)}
                    >
                      <TableCell className="font-medium">{cliente.empresa.name}</TableCell>
                      <TableCell className="font-mono text-sm">{formatCNPJ(cliente.cnpj)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={badgePlanoVariant(cliente.plano)}>
                          {cliente.plano}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{cliente.empresa._count.users}</TableCell>
                      <TableCell className="text-center">{cliente.empresa._count.bids}</TableCell>
                      <TableCell>{formatCurrency(Number(cliente.mensalidade))}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={badgeStatusVariant(cliente.status)}>
                          {cliente.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(cliente.dataInicio)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Modal de Criação */}
        <CriarClienteModal
          aberto={modalAberto}
          onFechar={() => setModalAberto(false)}
          onSucesso={() => {
            setModalAberto(false);
            carregarDados();
          }}
        />
      </div>
    </Layout>
  );
}
