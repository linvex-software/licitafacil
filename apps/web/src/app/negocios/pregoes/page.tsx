"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { AuthGuard } from "@/components/AuthGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  exportarResultadosPregoesCsv,
  listarResultadosPregoes,
  metricasPregoes,
  registrarResultadoPregao,
  type FonteValorReferenciaPregao,
  type PregaoCentralItem,
  type ResultadoPregao,
} from "@/lib/api";
import { Download, Filter, Gavel, Loader2, Save, Search } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function formatarDataHora(s?: string | null) {
  if (!s) return "-";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "-";
  return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

function badgeResultado(r?: string | null) {
  const res = (r ?? "PENDENTE").toString();
  if (res === "GANHOU") return <Badge variant="default">Ganhou</Badge>;
  if (res === "PERDEU") return <Badge variant="secondary">Perdeu</Badge>;
  if (res === "DESISTIU") return <Badge variant="outline">Desistiu</Badge>;
  return <Badge variant="outline">Pendente</Badge>;
}

type Filtros = {
  portal: string;
  resultado: ResultadoPregao | "ALL";
  periodoPor: "INICIO" | "FINALIZACAO";
  dataInicio: string;
  dataFim: string;
  licitacao: string;
};

type ModalState = {
  open: boolean;
  pregao?: PregaoCentralItem | null;
};

export default function CentralPregoesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [filtros, setFiltros] = useState<Filtros>({
    portal: "ALL",
    resultado: "ALL",
    periodoPor: "INICIO",
    dataInicio: "",
    dataFim: "",
    licitacao: "",
  });
  const [page, setPage] = useState(1);
  const limit = 12;

  const [modal, setModal] = useState<ModalState>({ open: false, pregao: null });
  const [formResultado, setFormResultado] = useState<ResultadoPregao>("PENDENTE");
  const [formValorFinal, setFormValorFinal] = useState<string>("");
  const [formValorReferencia, setFormValorReferencia] = useState<string>("");
  const [formFonte, setFormFonte] = useState<FonteValorReferenciaPregao | "">("");
  const [formObs, setFormObs] = useState<string>("");

  const queryParams = useMemo(() => {
    return {
      portal: filtros.portal !== "ALL" ? filtros.portal : undefined,
      resultado: filtros.resultado !== "ALL" ? filtros.resultado : undefined,
      periodoPor: filtros.periodoPor,
      dataInicio: filtros.dataInicio || undefined,
      dataFim: filtros.dataFim || undefined,
      licitacao: filtros.licitacao || undefined,
      page,
      limit,
    };
  }, [filtros, page]);

  const { data: listResp, isLoading: loadingList } = useQuery({
    queryKey: ["central-pregoes", queryParams],
    queryFn: () => listarResultadosPregoes(queryParams),
  });

  const { data: metricas } = useQuery({
    queryKey: ["central-pregoes-metricas", queryParams.portal, queryParams.resultado, queryParams.dataInicio, queryParams.dataFim, queryParams.licitacao],
    queryFn: () =>
      metricasPregoes({
        portal: queryParams.portal,
        resultado: queryParams.resultado as ResultadoPregao | undefined,
        periodoPor: queryParams.periodoPor,
        dataInicio: queryParams.dataInicio,
        dataFim: queryParams.dataFim,
        licitacao: queryParams.licitacao,
      }),
  });

  const items = listResp?.items ?? [];
  const total = listResp?.total ?? 0;
  const totalPages = Math.max(Math.ceil(total / limit), 1);

  const salvarMutation = useMutation({
    mutationFn: async () => {
      if (!modal.pregao?.id) throw new Error("Pregão inválido.");
      const valorFinal = formValorFinal.trim() ? Number(formValorFinal.replace(",", ".")) : null;
      const valorReferencia = formValorReferencia.trim() ? Number(formValorReferencia.replace(",", ".")) : null;
      if (valorFinal != null && (Number.isNaN(valorFinal) || valorFinal < 0)) throw new Error("Valor final inválido.");
      if (valorReferencia != null && (Number.isNaN(valorReferencia) || valorReferencia < 0)) throw new Error("Valor de referência inválido.");

      return registrarResultadoPregao(modal.pregao.id, {
        resultado: formResultado,
        valorFinal,
        valorReferencia,
        fonteValorReferencia: formFonte || null,
        observacao: formObs?.trim() || null,
      });
    },
    onSuccess: () => {
      toast({ title: "Resultado registrado", description: "Os dados foram salvos com sucesso." });
      setModal({ open: false, pregao: null });
      queryClient.invalidateQueries({ queryKey: ["central-pregoes"] });
      queryClient.invalidateQueries({ queryKey: ["central-pregoes-metricas"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar",
        description: error?.response?.data?.message || error?.message || "Não foi possível registrar o resultado.",
        variant: "destructive",
      });
    },
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const { blob, fileName } = await exportarResultadosPregoesCsv({
        portal: queryParams.portal,
        resultado: queryParams.resultado as ResultadoPregao | undefined,
        periodoPor: queryParams.periodoPor,
        dataInicio: queryParams.dataInicio,
        dataFim: queryParams.dataFim,
        licitacao: queryParams.licitacao,
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    },
    onError: (error: any) => {
      toast({
        title: "Falha ao exportar",
        description: error?.response?.data?.message || error?.message || "Não foi possível exportar o CSV.",
        variant: "destructive",
      });
    },
  });

  function abrirModal(p: PregaoCentralItem) {
    setModal({ open: true, pregao: p });
    setFormResultado((p.resultado as ResultadoPregao) || "PENDENTE");
    setFormValorFinal(p.valorFinal != null ? String(p.valorFinal) : "");
    setFormValorReferencia(p.valorReferencia != null ? String(p.valorReferencia) : "");
    setFormFonte((p.fonteValorReferencia as FonteValorReferenciaPregao) || "");
    setFormObs(p.observacao || "");
  }

  const economiaLinha = useMemo(() => {
    if (!modal.pregao) return null;
    const ref = formValorReferencia.trim() ? Number(formValorReferencia.replace(",", ".")) : null;
    const fin = formValorFinal.trim() ? Number(formValorFinal.replace(",", ".")) : null;
    if (ref == null || fin == null || Number.isNaN(ref) || Number.isNaN(fin)) return null;
    return ref - fin;
  }, [modal.pregao, formValorReferencia, formValorFinal]);

  return (
    <AuthGuard>
      <Layout fullWidth>
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100">
                <Gavel className="h-6 w-6 text-muted-foreground" />
                Central de Pregões
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                Registre resultados e acompanhe métricas com base em valor de referência.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => exportMutation.mutate()}
              disabled={exportMutation.isPending}
              className="gap-2"
            >
              {exportMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Exportar CSV
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Total</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold">{metricas?.total ?? "-"}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Finalizados</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold">{metricas?.totalFinalizados ?? "-"}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Economia total</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold">
                {typeof metricas?.economiaTotal === "number" ? money.format(metricas.economiaTotal) : "-"}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Base de cálculo</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {metricas?.baseEconomia?.totalComValores ?? 0} pregão(ões) com valores
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="space-y-1.5">
                <Label>Portal</Label>
                <Select value={filtros.portal} onValueChange={(v) => { setFiltros((s) => ({ ...s, portal: v })); setPage(1); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos</SelectItem>
                    <SelectItem value="PNCP">PNCP</SelectItem>
                    <SelectItem value="BNC">BNC</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Resultado</Label>
                <Select value={filtros.resultado} onValueChange={(v) => { setFiltros((s) => ({ ...s, resultado: v as any })); setPage(1); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos</SelectItem>
                    <SelectItem value="PENDENTE">Pendente</SelectItem>
                    <SelectItem value="GANHOU">Ganhou</SelectItem>
                    <SelectItem value="PERDEU">Perdeu</SelectItem>
                    <SelectItem value="DESISTIU">Desistiu</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Filtrar período por</Label>
                <Select value={filtros.periodoPor} onValueChange={(v) => { setFiltros((s) => ({ ...s, periodoPor: v as any })); setPage(1); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INICIO">Início do pregão</SelectItem>
                    <SelectItem value="FINALIZACAO">Finalização (registro do resultado)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Data início</Label>
                <Input
                  type="date"
                  value={filtros.dataInicio}
                  onChange={(e) => { setFiltros((s) => ({ ...s, dataInicio: e.target.value })); setPage(1); }}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Data fim</Label>
                <Input
                  type="date"
                  value={filtros.dataFim}
                  onChange={(e) => { setFiltros((s) => ({ ...s, dataFim: e.target.value })); setPage(1); }}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Licitação / busca</Label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <Input
                    value={filtros.licitacao}
                    onChange={(e) => { setFiltros((s) => ({ ...s, licitacao: e.target.value })); setPage(1); }}
                    placeholder="Número, órgão, objeto..."
                    className="pl-9"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {loadingList ? (
              <div className="col-span-full flex items-center justify-center py-14">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : items.length === 0 ? (
              <div className="col-span-full rounded-xl border border-gray-100 bg-white p-8 text-center text-sm text-muted-foreground dark:border-gray-800 dark:bg-gray-900">
                Nenhum pregão encontrado com os filtros atuais.
              </div>
            ) : (
              items.map((p) => {
                const econ =
                  typeof p.valorReferencia === "number" && typeof p.valorFinal === "number"
                    ? p.valorReferencia - p.valorFinal
                    : null;
                return (
                  <Card key={p.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <CardTitle className="text-base truncate">
                            {p.numeroPregao} • {p.portal}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground truncate">
                            {p.bid?.title ? `Licitação: ${p.bid.title}` : "Sem licitação vinculada"}
                          </p>
                        </div>
                        <div className="shrink-0">{badgeResultado(p.resultado || "PENDENTE")}</div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="text-sm text-gray-800 dark:text-gray-100 line-clamp-2">{p.objeto}</div>
                      <div className="text-xs text-muted-foreground">
                        <div><span className="font-medium">Órgão:</span> {p.orgao || "-"}</div>
                        <div><span className="font-medium">Início:</span> {formatarDataHora(p.horarioInicio)}</div>
                        <div><span className="font-medium">Finalizado:</span> {formatarDataHora(p.finalizadoEm)}</div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="rounded-lg border p-2">
                          <div className="text-muted-foreground">Ref.</div>
                          <div className="font-semibold">{typeof p.valorReferencia === "number" ? money.format(p.valorReferencia) : "-"}</div>
                        </div>
                        <div className="rounded-lg border p-2">
                          <div className="text-muted-foreground">Final</div>
                          <div className="font-semibold">{typeof p.valorFinal === "number" ? money.format(p.valorFinal) : "-"}</div>
                        </div>
                        <div className="rounded-lg border p-2">
                          <div className="text-muted-foreground">Economia</div>
                          <div className="font-semibold">{typeof econ === "number" ? money.format(econ) : "-"}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-end">
                        <Button type="button" size="sm" onClick={() => abrirModal(p)} className="gap-2">
                          <Save className="h-4 w-4" />
                          Registrar resultado
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Página {page} de {totalPages} • {total} registro(s)
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page <= 1}>
                Anterior
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(p + 1, totalPages))} disabled={page >= totalPages}>
                Próxima
              </Button>
            </div>
          </div>
        </div>

        <Dialog open={modal.open} onOpenChange={(open) => !open && setModal({ open: false, pregao: null })}>
          {modal.pregao && (
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Registrar resultado</DialogTitle>
                <DialogDescription>
                  {modal.pregao.numeroPregao} • {modal.pregao.portal}
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Resultado</Label>
                  <Select value={formResultado} onValueChange={(v) => setFormResultado(v as ResultadoPregao)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDENTE">Pendente</SelectItem>
                      <SelectItem value="GANHOU">Ganhou</SelectItem>
                      <SelectItem value="PERDEU">Perdeu</SelectItem>
                      <SelectItem value="DESISTIU">Desistiu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Fonte do valor de referência</Label>
                  <Select value={formFonte || "EMPTY"} onValueChange={(v) => setFormFonte(v === "EMPTY" ? "" : (v as any))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Opcional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EMPTY">Não informar</SelectItem>
                      <SelectItem value="PNCP">PNCP</SelectItem>
                      <SelectItem value="EDITAL">Edital</SelectItem>
                      <SelectItem value="MANUAL">Manual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Valor de referência</Label>
                  <Input inputMode="decimal" value={formValorReferencia} onChange={(e) => setFormValorReferencia(e.target.value)} placeholder="Ex: 10000" />
                </div>

                <div className="space-y-1.5">
                  <Label>Valor final</Label>
                  <Input inputMode="decimal" value={formValorFinal} onChange={(e) => setFormValorFinal(e.target.value)} placeholder="Ex: 9500" />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <Label>Observação</Label>
                  <Input value={formObs} onChange={(e) => setFormObs(e.target.value)} placeholder="Opcional" />
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                {typeof economiaLinha === "number" ? (
                  <>Economia calculada: <span className="font-semibold text-gray-800 dark:text-gray-100">{money.format(economiaLinha)}</span></>
                ) : (
                  <>Informe valor de referência e valor final para calcular a economia.</>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setModal({ open: false, pregao: null })} disabled={salvarMutation.isPending}>
                  Cancelar
                </Button>
                <Button onClick={() => salvarMutation.mutate()} disabled={salvarMutation.isPending} className="gap-2">
                  {salvarMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          )}
        </Dialog>
      </Layout>
    </AuthGuard>
  );
}

