"use client";

import { useRef, useState } from "react";
import { Layout } from "@/components/layout";
import { AuthGuard } from "@/components/AuthGuard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { api, isBillingHandledError } from "@/lib/api";
import { formatCurrency, formatDate, maskCNPJ } from "@/lib/utils";
import {
  Search,
  Loader2,
  Building2,
  FileText,
  TrendingUp,
  Users,
  Download,
  Info,
  AlertTriangle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type OrgaoFrequente = {
  nome: string;
  quantidade: number;
  valorTotal: number;
};

type ContratoRecente = {
  id: string;
  orgao: string;
  objeto: string;
  valor: number;
  dataInicio: string;
  dataFim: string;
};

type ConcorrentesAnalyticsResponse = {
  cnpj: string;
  razaoSocial: string;
  totalContratos: number;
  valorTotal: number;
  valorMedio: number;
  orgaosUnicos: number;
  orgaosFrequentes: OrgaoFrequente[];
  contratosRecentes: ContratoRecente[];
};

type TipoErro = "pncp_instavel" | "generico" | null;

/* ─── Utilitários ────────────────────────────────────── */
function validarCNPJ(cnpj: string): boolean {
  const c = cnpj.replace(/\D/g, "");
  if (c.length !== 14) return false;
  if (/^(\d)\1+$/.test(c)) return false;

  const calc = (base: string, pesos: number[]) => {
    const soma = base
      .split("")
      .reduce((acc, d, i) => acc + Number(d) * pesos[i], 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const d1 = calc(c.slice(0, 12), pesos1);
  const d2 = calc(c.slice(0, 13), pesos2);

  return Number(c[12]) === d1 && Number(c[13]) === d2;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + "…";
}

function capitalizarPalavras(texto: string): string {
  return texto
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatarValorCompacto(valor: number): string {
  if (valor >= 1_000_000_000) {
    return `R$ ${(valor / 1_000_000_000).toFixed(1).replace(".", ",")} Bi`;
  }
  if (valor >= 1_000_000) {
    return `R$ ${(valor / 1_000_000).toFixed(1).replace(".", ",")} Mi`;
  }
  return formatCurrency(valor);
}

function escaparCsvCampo(valor: string): string {
  return `"${valor.replace(/"/g, '""')}"`;
}

function exportarCsv(contratos: ContratoRecente[], cnpj: string) {
  const hoje = new Date().toISOString().slice(0, 10);
  const cabecalho = ["Fornecedor Vencedor", "Objeto", "Valor (R$)", "Data de Início"];
  const linhas = contratos.map((c) => [
    escaparCsvCampo(c.orgao),
    escaparCsvCampo(c.objeto),
    escaparCsvCampo(c.valor.toFixed(2).replace(".", ",")),
    escaparCsvCampo(formatDate(c.dataInicio)),
  ]);

  const csv = [cabecalho.map(escaparCsvCampo), ...linhas]
    .map((l) => l.join(","))
    .join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `analise-contratos-${cnpj}-${hoje}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function classificarErro(error: unknown): TipoErro {
  const status = (error as { response?: { status?: number } })?.response?.status;
  if (status === 500 || status === 503) return "pncp_instavel";
  // timeout do axios não tem response
  if (!status) return "pncp_instavel";
  return "generico";
}

function resolverMensagemErro(error: unknown): string {
  const status = (error as { response?: { status?: number } })?.response?.status;
  if (status === 422)
    return "CNPJ não encontrado no PNCP. Verifique se o órgão está cadastrado.";
  const apiMsg = (error as { response?: { data?: { message?: string } } })
    ?.response?.data?.message;
  return apiMsg || "Erro ao consultar. Tente novamente.";
}

/* ─── Skeleton ──────────────────────────────────────── */
function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-gray-200 dark:bg-gray-800" />
        ))}
      </div>
      <div className="h-72 rounded-xl bg-gray-200 dark:bg-gray-800" />
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 rounded bg-gray-200 dark:bg-gray-800" />
        ))}
      </div>
    </div>
  );
}

/* ─── Empty State ────────────────────────────────────── */
function EmptyState({
  cnpj,
  onLimpar,
}: {
  cnpj: string;
  onLimpar: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
      <Search className="w-12 h-12 text-gray-300 dark:text-gray-600" />
      <div className="space-y-1">
        <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
          Nenhum contrato encontrado
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
          Este órgão não possui contratos publicados no PNCP no último ano, ou o CNPJ{" "}
          <span className="font-mono font-medium">{cnpj}</span> não corresponde a um
          órgão público comprador.
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onLimpar}>
        Tentar outro CNPJ
      </Button>
    </div>
  );
}

/* ─── Metric Card ────────────────────────────────────── */
function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {label}
            </p>
            <p className="mt-1.5 text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">
              {value}
            </p>
          </div>
          <div className="shrink-0 rounded-lg bg-gray-100 dark:bg-gray-800 p-2.5">
            <Icon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Page ───────────────────────────────────────────── */
export default function AnaliseConcorrentesPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [cnpj, setCnpj] = useState("");
  const [cnpjErro, setCnpjErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [tipoErro, setTipoErro] = useState<TipoErro>(null);
  const [resultado, setResultado] = useState<ConcorrentesAnalyticsResponse | null>(null);
  const [buscado, setBuscado] = useState(false);
  const [ultimoCnpjBuscado, setUltimoCnpjBuscado] = useState("");

  async function executarBusca(cnpjLimpo: string) {
    setLoading(true);
    setErro(null);
    setTipoErro(null);
    setResultado(null);
    setBuscado(false);
    setUltimoCnpjBuscado(cnpjLimpo);

    try {
      const { data } = await api.get<ConcorrentesAnalyticsResponse>(
        "/analise/concorrentes",
        { params: { cnpj: cnpjLimpo }, timeout: 35000 },
      );
      setResultado(data);
    } catch (error: unknown) {
      if (isBillingHandledError(error)) {
        return;
      }
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        setResultado({
          cnpj: cnpjLimpo,
          razaoSocial: "",
          totalContratos: 0,
          valorTotal: 0,
          valorMedio: 0,
          orgaosUnicos: 0,
          orgaosFrequentes: [],
          contratosRecentes: [],
        });
      } else {
        setTipoErro(classificarErro(error));
        setErro(resolverMensagemErro(error));
      }
    } finally {
      setLoading(false);
      setBuscado(true);
    }
  }

  async function handleBuscar() {
    const cnpjLimpo = cnpj.replace(/\D/g, "");

    if (cnpjLimpo.length !== 14) {
      setCnpjErro("Informe um CNPJ com 14 dígitos.");
      return;
    }

    if (!validarCNPJ(cnpjLimpo)) {
      setCnpjErro("CNPJ inválido. Verifique os dígitos.");
      return;
    }

    setCnpjErro(null);
    await executarBusca(cnpjLimpo);
  }

  function handleLimpar() {
    setCnpj("");
    setResultado(null);
    setErro(null);
    setTipoErro(null);
    setBuscado(false);
    setCnpjErro(null);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  const semDados =
    !loading && buscado && !erro && resultado && resultado.totalContratos === 0;

  const chartData =
    resultado?.orgaosFrequentes.map((o) => ({
      nome: truncate(o.nome, 15),
      nomeCompleto: o.nome,
      contratos: o.quantidade,
    })) ?? [];

  return (
    <AuthGuard>
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Analytics de Concorrência
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Pesquise um órgão público e veja quais fornecedores estão ganhando contratos
            </p>
          </div>

          {/* Busca */}
          <Card>
            <CardHeader>
              <CardTitle>Pesquisar órgão comprador</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <Label>CNPJ do órgão comprador</Label>
                  <Input
                    ref={inputRef}
                    placeholder="00.000.000/0000-00"
                    value={cnpj}
                    onChange={(e) => {
                      setCnpj(maskCNPJ(e.target.value));
                      setCnpjErro(null);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
                    className={`mt-1 ${cnpjErro ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                  />
                  {cnpjErro ? (
                    <div className="mt-1 space-y-0.5">
                      <p className="text-xs text-red-500">{cnpjErro}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        Dica: use o CNPJ completo com 14 dígitos. Ex: 00.394.544/0001-85
                      </p>
                    </div>
                  ) : null}
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={handleBuscar}
                    disabled={loading}
                    className="w-full sm:w-auto"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Buscando...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-2" />
                        Pesquisar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Erro da API */}
          {erro && tipoErro === "pncp_instavel" && (
            <Alert className="border-yellow-400 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-700">
              <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
              <AlertTitle className="text-yellow-800 dark:text-yellow-400">
                Serviço instável
              </AlertTitle>
              <AlertDescription className="text-yellow-700 dark:text-yellow-500">
                O serviço do PNCP está instável no momento. Os dados podem estar
                desatualizados ou indisponíveis. Tente novamente em alguns minutos.
              </AlertDescription>
              <div className="mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-yellow-500 text-yellow-700 hover:bg-yellow-100 dark:text-yellow-400 dark:border-yellow-700 dark:hover:bg-yellow-950/50"
                  onClick={() => executarBusca(ultimoCnpjBuscado)}
                  disabled={loading}
                >
                  Tentar novamente
                </Button>
              </div>
            </Alert>
          )}

          {erro && tipoErro === "generico" && (
            <Alert variant="destructive">
              <AlertTitle>Erro na consulta</AlertTitle>
              <AlertDescription>{erro}</AlertDescription>
              <div className="mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-400 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                  onClick={() => executarBusca(ultimoCnpjBuscado)}
                  disabled={loading}
                >
                  Tentar novamente
                </Button>
              </div>
            </Alert>
          )}

          {/* Loading skeleton */}
          {loading && <LoadingSkeleton />}

          {/* Empty state */}
          {semDados && resultado && (
            <EmptyState cnpj={cnpj} onLimpar={handleLimpar} />
          )}

          {/* Resultados */}
          {resultado && resultado.totalContratos > 0 && !loading && (
            <div className="space-y-6">
              {/* Razão social */}
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Órgão</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {capitalizarPalavras(resultado.razaoSocial)}
                </p>
              </div>

              {/* 4 cards de métricas */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard
                  label="Total de Contratos"
                  value={resultado.totalContratos.toLocaleString("pt-BR")}
                  icon={FileText}
                />
                <MetricCard
                  label="Valor Total"
                  value={formatarValorCompacto(resultado.valorTotal)}
                  icon={TrendingUp}
                />
                <MetricCard
                  label="Valor Médio"
                  value={formatarValorCompacto(resultado.valorMedio)}
                  icon={Building2}
                />
                <MetricCard
                  label="Fornecedores Únicos"
                  value={resultado.orgaosUnicos.toLocaleString("pt-BR")}
                  icon={Users}
                />
              </div>

              {/* Aviso de dados parciais */}
              <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Exibindo os 100 contratos mais recentes do último ano publicados no PNCP.
                </span>
              </div>

              {/* Gráfico top 5 fornecedores */}
              {chartData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Top 5 fornecedores por volume de contratos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ bottom: 40 }}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(156,163,175,0.2)"
                          />
                          <XAxis
                            dataKey="nome"
                            tick={{ fontSize: 11, fill: "#9ca3af" }}
                            angle={-20}
                            textAnchor="end"
                            interval={0}
                          />
                          <YAxis
                            tick={{ fontSize: 11, fill: "#9ca3af" }}
                            allowDecimals={false}
                          />
                          <RechartsTooltip
                            contentStyle={{
                              backgroundColor: "#1f2937",
                              border: "1px solid #374151",
                              borderRadius: "8px",
                              color: "#f9fafb",
                              fontSize: "12px",
                            }}
                            formatter={(value: number | undefined) => [
                              `${value ?? 0} contrato${(value ?? 0) !== 1 ? "s" : ""}`,
                              "Quantidade",
                            ]}
                            labelFormatter={(
                              _label: unknown,
                              payload: readonly {
                                payload?: { nomeCompleto?: string };
                              }[],
                            ) => payload?.[0]?.payload?.nomeCompleto ?? ""}
                          />
                          <Bar
                            dataKey="contratos"
                            fill="#3b82f6"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Lista de contratos recentes */}
              {resultado.contratosRecentes.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-4">
                      <CardTitle>
                        Contratos recentes ({resultado.contratosRecentes.length})
                      </CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          exportarCsv(resultado.contratosRecentes, resultado.cnpj)
                        }
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Exportar CSV
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table className="min-w-full">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Fornecedor Vencedor</TableHead>
                            <TableHead>Objeto</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead>Data de Início</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TooltipProvider>
                            {resultado.contratosRecentes.map((c, i) => (
                              <TableRow key={`${c.id}-${i}`}>
                                <TableCell className="max-w-[180px]">
                                  <span
                                    className="truncate block text-sm"
                                    title={c.orgao}
                                  >
                                    {c.orgao}
                                  </span>
                                </TableCell>
                                <TableCell className="max-w-[340px]">
                                  {c.objeto.length > 80 ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="cursor-default text-sm">
                                          {truncate(c.objeto, 80)}
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent
                                        side="top"
                                        className="max-w-sm text-xs"
                                      >
                                        {c.objeto}
                                      </TooltipContent>
                                    </Tooltip>
                                  ) : (
                                    <span className="text-sm">{c.objeto}</span>
                                  )}
                                </TableCell>
                                <TableCell className="whitespace-nowrap text-sm">
                                  {formatCurrency(c.valor)}
                                </TableCell>
                                <TableCell className="whitespace-nowrap text-sm">
                                  {formatDate(c.dataInicio)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TooltipProvider>
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </Layout>
    </AuthGuard>
  );
}
