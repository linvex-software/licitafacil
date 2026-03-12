"use client";

import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { Search } from "lucide-react";

interface HistoricoDisputaResumo {
  id: string;
  portal: string;
  status: string;
  resultado: string;
  iniciadoEm: string | null;
  encerradoEm: string | null;
  bid: { id: string; title: string; agency: string } | null;
  economia: number;
  valorMaximoTotal: number;
  melhorLanceGlobal: number | null;
}

interface HistoricoResponse {
  data: HistoricoDisputaResumo[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export default function DisputaHistoricoPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [items, setItems] = useState<HistoricoDisputaResumo[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [licitacao, setLicitacao] = useState("");
  const [portal, setPortal] = useState<string | undefined>();
  const [resultado, setResultado] = useState<string | undefined>();
  const [dataInicio, setDataInicio] = useState<string>("");
  const [dataFim, setDataFim] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number | undefined> = {
        page,
        limit: 10,
        licitacao: licitacao || undefined,
        portal: portal || undefined,
        resultado: resultado || undefined,
        dataInicio: dataInicio || undefined,
        dataFim: dataFim || undefined,
      };
      const { data } = await api.get<HistoricoResponse>("/disputa/historico", { params });
      setItems(data.data);
      setTotalPages(data.pagination.totalPages);
    } catch {
      toast({ title: "Erro ao carregar histórico de disputas", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, portal, resultado]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  return (
    <Layout>
      <div className="mx-auto">
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-heading font-bold text-slate-900">
              Histórico de Disputas
            </h1>
            <p className="text-slate-600 mt-1">
              Consulte disputas encerradas, economia gerada e resultados por licitação.
            </p>
          </div>
        </div>

        <Card className="mb-6 border-slate-200">
          <CardContent className="py-4 space-y-4">
            <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar por licitação ou órgão..."
                  value={licitacao}
                  onChange={(e) => setLicitacao(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <Select value={portal} onValueChange={(v) => setPortal(v || undefined)}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Portal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COMPRASNET">Comprasnet</SelectItem>
                    <SelectItem value="BNC">BNC</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={resultado} onValueChange={(v) => setResultado(v || undefined)}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Resultado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GANHOU">Ganhou</SelectItem>
                    <SelectItem value="PERDEU">Perdeu</SelectItem>
                    <SelectItem value="CANCELOU">Cancelou</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="w-40"
                />
                <Input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="w-40"
                />
                <Button type="submit" className="whitespace-nowrap">
                  Filtrar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg font-heading">Disputas encerradas</CardTitle>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <p className="text-sm text-slate-500 py-4">Nenhuma disputa encerrada encontrada.</p>
            ) : (
              <div className="space-y-3">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Licitação</TableHead>
                      <TableHead>Órgão</TableHead>
                      <TableHead>Portal</TableHead>
                      <TableHead>Resultado</TableHead>
                      <TableHead>Início</TableHead>
                      <TableHead>Encerramento</TableHead>
                      <TableHead className="text-right">Economia</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow
                        key={item.id}
                        className="cursor-pointer hover:bg-slate-50"
                        onClick={() => router.push(`/disputa/historico/${item.id}`)}
                      >
                        <TableCell className="font-medium">
                          {item.bid?.title ?? "Disputa sem licitação vinculada"}
                        </TableCell>
                        <TableCell>{item.bid?.agency ?? "-"}</TableCell>
                        <TableCell>{item.portal}</TableCell>
                        <TableCell>{item.resultado}</TableCell>
                        <TableCell>
                          {item.iniciadoEm
                            ? new Date(item.iniciadoEm).toLocaleString("pt-BR")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {item.encerradoEm
                            ? new Date(item.encerradoEm).toLocaleString("pt-BR")
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          R$ {item.economia.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {totalPages > 1 && (
                  <div className="flex justify-between items-center pt-2 text-sm text-slate-600">
                    <span>
                      Página {page} de {totalPages}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={page === 1 || loading}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        Anterior
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={page === totalPages || loading}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      >
                        Próxima
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

