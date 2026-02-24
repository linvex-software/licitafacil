"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/button";
import { LimiteProgress } from "@/components/admin/limite-progress";
import { TabelaPagamentos } from "@/components/admin/tabela-pagamentos";
import { CriarPagamentoModal } from "@/components/admin/criar-pagamento-modal";
import { Layout } from "@/components/layout";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft, Building2, FileText, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";

interface UsoCliente {
  usuarios: { atual: number; limite: number; percentual: number };
  licitacoes: { atual: number; limite: number; percentual: number };
  storage: { atualGB: number; limiteGB: number; percentual: number };
}

interface Contrato {
  id: string;
  empresaId: string;
  planoNome: string;
  valorSetup: string | number;
  valorMensalidade: string | number;
  dataInicio: string;
  proximoVencimento: string;
  status: string;
  observacoes: string | null;
  empresa: {
    id: string;
    name: string;
  };
  pagamentos: Array<{
    id: string;
    tipo: string;
    valor: string | number;
    dataPrevista: string;
    dataPago: string | null;
    metodoPagamento: string | null;
    observacoes: string | null;
  }>;
}

const statusContratoVariant: Record<string, string> = {
  TRIAL: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  ATIVO: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800",
  SUSPENSO: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
  CANCELADO: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800",
};

export default function ClienteDetalhesPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const empresaId = params.id as string;

  const [uso, setUso] = useState<UsoCliente | null>(null);
  const [contrato, setContrato] = useState<Contrato | null>(null);
  const [loading, setLoading] = useState(true);
  const [empresaNome, setEmpresaNome] = useState("");

  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      const [usoRes, contratoRes] = await Promise.all([
        api.get(`/admin/clientes/${empresaId}/uso`),
        api.get(`/admin/contratos/${empresaId}`),
      ]);

      setUso(usoRes.data);
      if (contratoRes.data) {
        setContrato(contratoRes.data);
        setEmpresaNome(contratoRes.data.empresa?.name || "");
      }
    } catch (error: any) {
      if (error.response?.status === 403) {
        toast({
          title: "Acesso negado",
          description: "Você não tem permissão para acessar esta área",
          variant: "destructive",
        });
        router.push("/");
        return;
      }
      // Se o contrato não existir (404), não é erro crítico
      if (error.response?.status !== 404) {
        console.error("Erro ao carregar dados:", error);
      }
    } finally {
      setLoading(false);
    }
  }, [empresaId, router]);

  useEffect(() => {
    if (!authLoading && user?.role === "SUPER_ADMIN") {
      carregarDados();
    }
  }, [carregarDados, user, authLoading]);

  // Proteção de rota
  if (authLoading || !user || user.role !== "SUPER_ADMIN") {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-muted-foreground text-lg">
            Verificando permissões...
          </div>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-muted-foreground text-lg">
            Carregando detalhes do cliente...
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/admin/clientes")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Building2 className="h-8 w-8" />
              {empresaNome || "Cliente"}
            </h1>
            {contrato && (
              <p className="text-muted-foreground mt-1">
                Plano {contrato.planoNome} &middot;{" "}
                <Badge
                  variant="outline"
                  className={statusContratoVariant[contrato.status] || ""}
                >
                  {contrato.status}
                </Badge>
              </p>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="resumo" className="w-full">
          <TabsList>
            <TabsTrigger value="resumo" className="gap-2">
              <FileText className="h-4 w-4" />
              Resumo
            </TabsTrigger>
            <TabsTrigger value="financeiro" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Financeiro
            </TabsTrigger>
          </TabsList>

          {/* Tab Resumo */}
          <TabsContent value="resumo" className="space-y-4 mt-4">
            {uso ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <LimiteProgress
                  titulo="Usuários"
                  atual={uso.usuarios.atual}
                  limite={uso.usuarios.limite}
                  percentual={uso.usuarios.percentual}
                />
                <LimiteProgress
                  titulo="Licitações (mês)"
                  atual={uso.licitacoes.atual}
                  limite={uso.licitacoes.limite}
                  percentual={uso.licitacoes.percentual}
                />
                <LimiteProgress
                  titulo="Storage"
                  atual={uso.storage.atualGB}
                  limite={uso.storage.limiteGB}
                  percentual={uso.storage.percentual}
                  unidade="GB"
                />
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Dados de uso não disponíveis.
                </CardContent>
              </Card>
            )}

            {/* Info do Contrato */}
            {contrato && (
              <Card>
                <CardHeader>
                  <CardTitle>Informações do Contrato</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Valor Setup
                      </p>
                      <p className="text-lg font-semibold">
                        {formatCurrency(Number(contrato.valorSetup))}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Mensalidade
                      </p>
                      <p className="text-lg font-semibold">
                        {formatCurrency(Number(contrato.valorMensalidade))}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Início
                      </p>
                      <p className="text-lg font-semibold">
                        {format(new Date(contrato.dataInicio), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Próximo Vencimento
                      </p>
                      <p className="text-lg font-semibold">
                        {format(
                          new Date(contrato.proximoVencimento),
                          "dd/MM/yyyy",
                          { locale: ptBR },
                        )}
                      </p>
                    </div>
                  </div>
                  {contrato.observacoes && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        Observações
                      </p>
                      <p className="text-sm mt-1">{contrato.observacoes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {!contrato && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhum contrato cadastrado para este cliente.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab Financeiro */}
          <TabsContent value="financeiro" className="space-y-4 mt-4">
            {contrato ? (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">
                    Histórico de Pagamentos
                  </h2>
                  <CriarPagamentoModal
                    contratoId={contrato.id}
                    onSuccess={carregarDados}
                  />
                </div>
                <Card>
                  <CardContent className="pt-6">
                    <TabelaPagamentos
                      pagamentos={contrato.pagamentos || []}
                    />
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Crie um contrato para este cliente antes de registrar
                  pagamentos.
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
