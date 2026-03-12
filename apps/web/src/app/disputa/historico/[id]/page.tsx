"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { Download } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface HistoricoDetalheResponse {
  disputa: {
    id: string;
    portal: string;
    status: string;
    iniciadoEm: string | null;
    encerradoEm: string | null;
    bid: { id: string; title: string; agency: string } | null;
  };
  metricas: {
    valorMaximoTotal: number;
    economiaTotal: number;
    melhorLanceGlobal: number | null;
    duracaoSegundos: number | null;
    totalLancesEnviados: number;
    nossoUltimoLance: number | null;
  };
  timeline: Array<{
    id: string;
    itemNumero: number;
    valorEnviado: number | null;
    melhorLance: number | null;
    posicao: number | null;
    evento: string;
    detalhe: string | null;
    timestamp: string;
  }>;
}

export default function DisputaHistoricoDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [data, setData] = useState<HistoricoDetalheResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<HistoricoDetalheResponse>(`/disputa/historico/${id}`);
      setData(data);
    } catch {
      toast({ title: "Erro ao carregar detalhes da disputa", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleExportPdf = async () => {
    try {
      setDownloading(true);
      const response = await api.get(`/disputa/historico/${id}/pdf`, {
        responseType: "arraybuffer",
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const header = response.headers["content-disposition"] as string | undefined;
      const match = header?.match(/filename="([^"]+)"/);
      const fileName = match?.[1] || "disputa_historico.pdf";
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Erro ao gerar PDF", variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  if (loading || !data) {
    return (
      <Layout>
        <div className="mx-auto py-10 text-center text-slate-500 text-sm">
          Carregando detalhes da disputa...
        </div>
      </Layout>
    );
  }

  const { disputa, metricas, timeline } = data;

  const duracaoMin =
    metricas.duracaoSegundos != null ? Math.round(metricas.duracaoSegundos / 60) : null;

  const chartData = timeline
    .filter((e) => e.melhorLance != null)
    .map((e) => ({
      time: new Date(e.timestamp).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      melhorLance: e.melhorLance as number,
    }));

  return (
    <Layout>
      <div className="mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-heading font-bold text-slate-900">
              Detalhes da Disputa
            </h1>
            <p className="text-slate-600 mt-1">
              Histórico completo de lances e métricas da disputa.
            </p>
          </div>
          <Button
            type="button"
            onClick={handleExportPdf}
            disabled={downloading}
            className="bg-slate-900 hover:bg-slate-800 text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar PDF
          </Button>
        </div>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg font-heading">Resumo</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs text-slate-500 mb-1">Licitação</p>
              <p className="text-sm font-medium text-slate-900">
                {disputa.bid?.title ?? "Disputa sem licitação vinculada"}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{disputa.bid?.agency ?? "-"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Portal / Status</p>
              <p className="text-sm font-medium text-slate-900">
                {disputa.portal} • {disputa.status}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Início:{" "}
                {disputa.iniciadoEm
                  ? new Date(disputa.iniciadoEm).toLocaleString("pt-BR")
                  : "-"}
              </p>
              <p className="text-xs text-slate-500">
                Encerramento:{" "}
                {disputa.encerradoEm
                  ? new Date(disputa.encerradoEm).toLocaleString("pt-BR")
                  : "-"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-slate-500 mb-1">Métricas</p>
              <p className="text-sm text-slate-700">
                Valor máximo total:{" "}
                <span className="font-semibold">
                  R$ {metricas.valorMaximoTotal.toFixed(2)}
                </span>
              </p>
              <p className="text-sm text-slate-700">
                Economia gerada:{" "}
                <span className="font-semibold text-emerald-600">
                  R$ {metricas.economiaTotal.toFixed(2)}
                </span>
              </p>
              <p className="text-sm text-slate-700">
                Lance vencedor (melhor lance):{" "}
                <span className="font-semibold">
                  {metricas.melhorLanceGlobal != null
                    ? `R$ ${metricas.melhorLanceGlobal.toFixed(2)}`
                    : "-"}
                </span>
              </p>
              <p className="text-sm text-slate-700">
                Seu lance final:{" "}
                <span className="font-semibold">
                  {metricas.nossoUltimoLance != null
                    ? `R$ ${metricas.nossoUltimoLance.toFixed(2)}`
                    : "-"}
                </span>
              </p>
              <p className="text-sm text-slate-700">
                Total de lances enviados:{" "}
                <span className="font-semibold">{metricas.totalLancesEnviados}</span>
              </p>
              <p className="text-xs text-slate-500">
                Duração aproximada: {duracaoMin != null ? `${duracaoMin} min` : "-"}
              </p>
            </div>
          </CardContent>
        </Card>

        {chartData.length > 0 && (
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg font-heading">
                Evolução do melhor lance ao longo da sessão
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="time"
                      tick={{ fontSize: 10 }}
                      tickMargin={8}
                      stroke="#64748b"
                    />
                    <YAxis
                      tickFormatter={(v: number) => `R$ ${v.toFixed(0)}`}
                      stroke="#64748b"
                      width={70}
                    />
                    <Tooltip
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(value: any) =>
                        typeof value === "number"
                          ? [`R$ ${value.toFixed(2)}`, "Melhor lance"]
                          : [String(value ?? ""), "Melhor lance"]
                      }
                      labelFormatter={(label) => `Horário: ${label}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="melhorLance"
                      stroke="#0f172a"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg font-heading">Linha do tempo de lances</CardTitle>
          </CardHeader>
          <CardContent>
            {timeline.length === 0 ? (
              <p className="text-sm text-slate-500 py-4">
                Nenhum evento registrado para esta disputa.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Evento</TableHead>
                      <TableHead>Valor enviado</TableHead>
                      <TableHead>Melhor lance</TableHead>
                      <TableHead>Posição</TableHead>
                      <TableHead>Detalhe</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timeline.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell>
                          {new Date(e.timestamp).toLocaleString("pt-BR")}
                        </TableCell>
                        <TableCell>{e.itemNumero}</TableCell>
                        <TableCell>{e.evento}</TableCell>
                        <TableCell>
                          {e.valorEnviado != null
                            ? `R$ ${e.valorEnviado.toFixed(2)}`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {e.melhorLance != null
                            ? `R$ ${e.melhorLance.toFixed(2)}`
                            : "-"}
                        </TableCell>
                        <TableCell>{e.posicao != null ? `#${e.posicao}` : "-"}</TableCell>
                        <TableCell>{e.detalhe ?? ""}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

