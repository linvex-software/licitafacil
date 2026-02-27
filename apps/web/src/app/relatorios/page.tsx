"use client";

import { useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  FileText,
  Download,
  Mail,
  Loader2,
  TrendingUp,
  Trophy,
  Target,
  Activity,
} from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { EnviarEmailModal } from "@/components/relatorios/enviar-email-modal";

const CORES_STATUS: Record<string, string> = {
  VENCIDA: "#16a34a",
  PARTICIPANDO: "#2563eb",
  ANALISANDO: "#d97706",
  PERDIDA: "#dc2626",
  DESCARTADA: "#6b7280",
  AGUARDANDO_RESULTADO: "#8b5cf6",
};

export default function RelatoriosPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [dados, setDados] = useState<any>(null);
  const [emailModalOpen, setEmailModalOpen] = useState(false);

  const [filtro, setFiltro] = useState({
    periodo: "mes",
    status: [] as string[],
    modalidades: [] as string[],
    orgao: "",
    dataInicio: "",
    dataFim: "",
  });

  function buildPayload() {
    const payload: Record<string, any> = { periodo: filtro.periodo };
    if (filtro.status.length > 0) payload.status = filtro.status;
    if (filtro.modalidades.length > 0) payload.modalidades = filtro.modalidades;
    if (filtro.orgao) payload.orgao = filtro.orgao;
    if (filtro.dataInicio) payload.dataInicio = filtro.dataInicio;
    if (filtro.dataFim) payload.dataFim = filtro.dataFim;
    return payload;
  }

  async function gerarRelatorio() {
    setLoading(true);
    try {
      const response = await api.post("/relatorios/dados", buildPayload());
      setDados(response.data);
      toast({
        title: "Relatório gerado!",
        description: `${response.data.metricas.total} licitações encontradas.`,
      });
    } catch {
      toast({ title: "Erro ao gerar relatório", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function downloadPdf() {
    setGerandoPdf(true);
    try {
      const response = await api.post("/relatorios/gerar-pdf", buildPayload(), {
        responseType: "blob",
        timeout: 30000,
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `relatorio-licitacoes-${new Date().toISOString().split("T")[0]}.pdf`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast({ title: "PDF baixado com sucesso!" });
    } catch {
      toast({ title: "Erro ao gerar PDF", variant: "destructive" });
    } finally {
      setGerandoPdf(false);
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="w-6 h-6" />
              Relatórios Gerenciais
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Exporte relatórios executivos em PDF para apresentar à diretoria
            </p>
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros do Relatório</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label>Período</Label>
                <Select
                  value={filtro.periodo}
                  onValueChange={(v) => setFiltro({ ...filtro, periodo: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mes">Este mês</SelectItem>
                    <SelectItem value="trimestre">Este trimestre</SelectItem>
                    <SelectItem value="ano">Este ano</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {filtro.periodo === "custom" && (
                <>
                  <div>
                    <Label>Data Início</Label>
                    <Input
                      type="date"
                      value={filtro.dataInicio}
                      onChange={(e) =>
                        setFiltro({ ...filtro, dataInicio: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Data Fim</Label>
                    <Input
                      type="date"
                      value={filtro.dataFim}
                      onChange={(e) =>
                        setFiltro({ ...filtro, dataFim: e.target.value })
                      }
                    />
                  </div>
                </>
              )}

              <div>
                <Label>Órgão (opcional)</Label>
                <Input
                  placeholder="Filtrar por órgão..."
                  value={filtro.orgao}
                  onChange={(e) =>
                    setFiltro({ ...filtro, orgao: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="mt-4">
              <Button
                onClick={gerarRelatorio}
                disabled={loading}
                className="w-full md:w-auto"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando...
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4 mr-2" /> Gerar Relatório
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview e Resultados */}
        {dados && (
          <>
            {/* Cards de Métricas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {dados.metricas.total}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center justify-center gap-1">
                    <FileText className="w-4 h-4" /> Total de Licitações
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {dados.metricas.ganhas}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center justify-center gap-1">
                    <Trophy className="w-4 h-4" /> Licitações Vencidas
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {dados.metricas.taxaSucesso}%
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center justify-center gap-1">
                    <Target className="w-4 h-4" /> Taxa de Sucesso
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-amber-600">
                    {dados.metricas.emAndamento}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center justify-center gap-1">
                    <Activity className="w-4 h-4" /> Em Andamento
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição por Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={dados.distribuicaoStatus}
                        dataKey="quantidade"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={(props: any) =>
                          `${props.status} ${props.percentual}%`
                        }
                      >
                        {dados.distribuicaoStatus.map(
                          (entry: any, index: number) => (
                            <Cell
                              key={index}
                              fill={CORES_STATUS[entry.status] || "#8884d8"}
                            />
                          ),
                        )}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Distribuição por Modalidade</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={dados.distribuicaoModalidade}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="modalidade" tick={{ fontSize: 10 }} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="quantidade" fill="#2563eb" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Timeline */}
            {dados.timeline.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Timeline - Licitações por Mês</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={dados.timeline}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mes" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="total"
                        stroke="#2563eb"
                        name="Total"
                      />
                      <Line
                        type="monotone"
                        dataKey="ganhas"
                        stroke="#16a34a"
                        name="Vencidas"
                      />
                      <Line
                        type="monotone"
                        dataKey="perdidas"
                        stroke="#dc2626"
                        name="Perdidas"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Tabela */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Detalhamento das Licitações ({dados.licitacoes.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="overflow-x-auto w-full">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Objeto</th>
                        <th className="text-left p-2">Modalidade</th>
                        <th className="text-left p-2">Órgão</th>
                        <th className="text-left p-2">Status</th>
                        <th className="text-left p-2">Data Criação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dados.licitacoes.map((l: any) => (
                        <tr key={l.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="p-2 max-w-xs truncate">{l.titulo}</td>
                          <td className="p-2 text-xs">
                            {l.modalidade?.replace(/_/g, " ")}
                          </td>
                          <td className="p-2 text-xs truncate max-w-32">
                            {l.orgao}
                          </td>
                          <td className="p-2">
                            <span
                              className="px-2 py-1 rounded-full text-xs font-medium"
                              style={{
                                background:
                                  (CORES_STATUS[l.status] || "#6b7280") + "20",
                                color: CORES_STATUS[l.status] || "#6b7280",
                              }}
                            >
                              {l.status}
                            </span>
                          </td>
                          <td className="p-2 text-xs">{l.dataCriacao}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Botões de Ação */}
            <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
              <Button
                variant="outline"
                onClick={() => setEmailModalOpen(true)}
              >
                <Mail className="w-4 h-4 mr-2" />
                Enviar por Email
              </Button>
              <Button onClick={downloadPdf} disabled={gerandoPdf}>
                {gerandoPdf ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando
                    PDF...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" /> Download PDF
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>

      {emailModalOpen && dados && (
        <EnviarEmailModal
          filtro={filtro}
          periodo={dados.periodo.label}
          onClose={() => setEmailModalOpen(false)}
        />
      )}
    </Layout>
  );
}
