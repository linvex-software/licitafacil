"use client";

import { useMemo, useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getHistoricoCompras, type HistoricoComprasResponse } from "@/lib/api";
import { formatCurrency, formatDate, maskCNPJ } from "@/lib/utils";
import { Search, Loader2, ArrowUpDown } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type SortDirection = "asc" | "desc";

export default function HistoricoComprasPage() {
  const [cnpj, setCnpj] = useState("");
  const [meses, setMeses] = useState("12");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<HistoricoComprasResponse | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  async function handleBuscar() {
    if (!cnpj.trim()) {
      setErro("Informe o CNPJ do órgão.");
      return;
    }

    setLoading(true);
    setErro(null);
    try {
      const data = await getHistoricoCompras(cnpj.replace(/\D/g, ""), Number(meses));
      setResultado(data);
    } catch (error: any) {
      setErro(error?.response?.data?.message || "Não foi possível consultar o histórico no momento.");
      setResultado(null);
    } finally {
      setLoading(false);
    }
  }

  const itensOrdenados = useMemo(() => {
    const itens = resultado?.itens || [];
    return [...itens].sort((a, b) =>
      sortDirection === "desc" ? b.valor - a.valor : a.valor - b.valor,
    );
  }, [resultado?.itens, sortDirection]);

  const emptyState = !loading && !erro && resultado && resultado.itens.length === 0;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Histórico de Compras
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Analise o histórico de compras de qualquer órgão público
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Label>CNPJ do órgão</Label>
                <Input
                  placeholder="00.000.000/0000-00"
                  value={cnpj}
                  onChange={(e) => setCnpj(maskCNPJ(e.target.value))}
                />
              </div>
              <div>
                <Label>Período</Label>
                <Select value={meses} onValueChange={setMeses}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 meses</SelectItem>
                    <SelectItem value="6">6 meses</SelectItem>
                    <SelectItem value="12">12 meses</SelectItem>
                    <SelectItem value="24">24 meses</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleBuscar} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Analisar
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {erro && (
          <Alert variant="destructive">
            <AlertTitle>Erro ao consultar</AlertTitle>
            <AlertDescription>{erro}</AlertDescription>
          </Alert>
        )}

        {resultado?.mensagem && !erro && (
          <Alert>
            <AlertTitle>Aviso</AlertTitle>
            <AlertDescription>{resultado.mensagem}</AlertDescription>
          </Alert>
        )}

        {loading && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span>Consultando dados do PNCP... isso pode levar até 1 minuto.</span>
            </div>

            <div className="h-[320px] w-full rounded-lg bg-muted animate-pulse" />

            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 w-full rounded bg-muted animate-pulse" />
              ))}
            </div>
          </div>
        )}

        {resultado && resultado.porMes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Valor total por mês</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={resultado.porMes}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis tickFormatter={(value) => formatCurrency(Number(value))} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Bar dataKey="valorTotal" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {resultado && resultado.itens.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Resultados ({resultado.itens.length})</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSortDirection((prev) => (prev === "desc" ? "asc" : "desc"))
                  }
                >
                  <ArrowUpDown className="w-4 h-4 mr-2" />
                  Ordenar por valor ({sortDirection === "desc" ? "maior" : "menor"})
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Objeto</TableHead>
                    <TableHead>Vencedor</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Modalidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itensOrdenados.map((item, index) => (
                    <TableRow key={`${item.numeroContrato}-${index}`}>
                      <TableCell>{formatDate(item.data)}</TableCell>
                      <TableCell className="max-w-[440px] truncate" title={item.objeto}>
                        {item.objeto}
                      </TableCell>
                      <TableCell>{item.vencedor}</TableCell>
                      <TableCell>{formatCurrency(item.valor)}</TableCell>
                      <TableCell>{item.modalidade}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {emptyState && (
          <Card>
            <CardContent className="pt-6 text-center text-gray-500 dark:text-gray-400">
              Nenhum resultado encontrado para este CNPJ
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
