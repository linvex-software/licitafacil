"use client";

import { useState } from "react";
import { Layout } from "@/components/layout";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getConcorrentes, type ConcorrentesResponse } from "@/lib/api";
import { formatCurrency, formatDate, maskCNPJ } from "@/lib/utils";
import { Loader2, Search, Target, Trophy, Wallet } from "lucide-react";

export default function ConcorrentesPage() {
  const [cnpj, setCnpj] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ConcorrentesResponse | null>(null);

  async function handleBuscar() {
    if (!cnpj.trim()) {
      setErro("Informe o CNPJ da empresa.");
      return;
    }

    setLoading(true);
    setErro(null);
    try {
      const data = await getConcorrentes(cnpj.replace(/\D/g, ""));
      setResultado(data);
    } catch (error: any) {
      setErro(error?.response?.data?.message || "Não foi possível consultar os concorrentes.");
      setResultado(null);
    } finally {
      setLoading(false);
    }
  }

  const emptyState =
    !loading && !erro && resultado && resultado.licitacoes.length === 0;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Análise de Concorrentes
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Veja o desempenho de empresas em contratações públicas
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-end">
              <div className="w-full sm:flex-1">
              <Label>CNPJ da empresa</Label>
              <Input
                placeholder="00.000.000/0000-00"
                value={cnpj}
                onChange={(e) => setCnpj(maskCNPJ(e.target.value))}
              />
              </div>
            <Button onClick={handleBuscar} disabled={loading} className="w-full sm:w-auto">
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
            </div>
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-28 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>

            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 w-full rounded bg-muted animate-pulse" />
              ))}
            </div>
          </div>
        )}

        {resultado && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-gray-500 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Taxa de Sucesso
                </div>
                <div className="text-3xl font-bold mt-2">
                  {resultado.taxaSucesso.toFixed(1)}%
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-gray-500 flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  Total de Licitações Vencidas
                </div>
                <div className="text-3xl font-bold mt-2">{resultado.totalVencidas}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-gray-500 flex items-center gap-2">
                  <Wallet className="w-4 h-4" />
                  Valor Total Ganho
                </div>
                <div className="text-3xl font-bold mt-2">
                  {formatCurrency(resultado.valorTotalGanho)}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {resultado && resultado.licitacoes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Licitações Vencidas ({resultado.licitacoes.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto w-full">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Objeto</TableHead>
                    <TableHead>Órgão</TableHead>
                    <TableHead>Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resultado.licitacoes.map((item, index) => (
                    <TableRow key={`${item.orgao}-${index}`}>
                      <TableCell>{formatDate(item.data)}</TableCell>
                      <TableCell className="max-w-[420px] truncate" title={item.objeto}>
                        {item.objeto}
                      </TableCell>
                      <TableCell>{item.orgao}</TableCell>
                      <TableCell>{formatCurrency(item.valor)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
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
