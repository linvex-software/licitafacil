"use client";

import { useMemo, useState } from "react";
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
import { getProdutos, type ProdutosResponse } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Loader2, Search, ArrowUpDown } from "lucide-react";

type SortField = "vezesHomologado" | "precoMedio";
type SortDirection = "asc" | "desc";

export default function ProdutosPage() {
  const [categoria, setCategoria] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ProdutosResponse | null>(null);
  const [sortField, setSortField] = useState<SortField>("vezesHomologado");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  async function handleBuscar() {
    if (!categoria.trim()) {
      setErro("Informe uma categoria.");
      return;
    }

    setLoading(true);
    setErro(null);
    try {
      const data = await getProdutos(categoria.trim());
      setResultado(data);
    } catch (error: any) {
      setErro(error?.response?.data?.message || "Não foi possível consultar os produtos.");
      setResultado(null);
    } finally {
      setLoading(false);
    }
  }

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "desc" ? "asc" : "desc"));
      return;
    }
    setSortField(field);
    setSortDirection("desc");
  }

  const itensOrdenados = useMemo(() => {
    const itens = resultado?.itens || [];
    return [...itens].sort((a, b) => {
      const aValue = sortField === "precoMedio" ? a.precoMedio : a.vezesHomologado;
      const bValue = sortField === "precoMedio" ? b.precoMedio : b.vezesHomologado;
      return sortDirection === "desc" ? bValue - aValue : aValue - bValue;
    });
  }, [resultado?.itens, sortField, sortDirection]);

  const emptyState = !loading && !erro && resultado && resultado.itens.length === 0;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Análise de Produtos
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Descubra produtos e marcas com maior recorrência em contratações
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Categoria</Label>
              <Input
                placeholder="Ex: informática, mobiliário, equipamentos médicos"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
              />
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

            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 w-full rounded bg-muted animate-pulse" />
              ))}
            </div>
          </div>
        )}

        {resultado && resultado.itens.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>
                Produtos encontrados ({resultado.itens.length}) - ordenado por{" "}
                {sortField === "precoMedio" ? "preço médio" : "vezes homologado"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Marca</TableHead>
                    <TableHead>
                      <Button variant="ghost" className="px-0" onClick={() => toggleSort("vezesHomologado")}>
                        Vezes Homologado
                        <ArrowUpDown className="w-4 h-4 ml-2" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" className="px-0" onClick={() => toggleSort("precoMedio")}>
                        Preço Médio
                        <ArrowUpDown className="w-4 h-4 ml-2" />
                      </Button>
                    </TableHead>
                    <TableHead>Preço Mín</TableHead>
                    <TableHead>Preço Máx</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itensOrdenados.map((item, index) => (
                    <TableRow key={`${item.produto}-${item.marca}-${index}`}>
                      <TableCell className="max-w-[360px] truncate" title={item.produto}>
                        {item.produto}
                      </TableCell>
                      <TableCell>{item.marca}</TableCell>
                      <TableCell>{item.vezesHomologado}</TableCell>
                      <TableCell>{formatCurrency(item.precoMedio)}</TableCell>
                      <TableCell>{formatCurrency(item.precoMinimo)}</TableCell>
                      <TableCell>{formatCurrency(item.precoMaximo)}</TableCell>
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
              Nenhum resultado encontrado para esta categoria
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
