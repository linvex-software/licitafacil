"use client";

import { useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/Badge";
import {
  Search,
  Download,
  ExternalLink,
  Loader2,
  BookmarkPlus,
  Info,
  RefreshCw,
} from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { SalvarBuscaModal } from "@/components/integracoes/salvar-busca-modal";
import { BuscasSalvasPanel } from "@/components/integracoes/buscas-salvas-panel";
import { useAuth } from "@/contexts/auth-context";
import { PageHeader } from "@/components/ui/page-header";

interface ResultadoBusca {
  numero: string;
  orgao: string;
  objeto: string;
  dataLimite: string | null;
  linkEdital: string | null;
  uasg: string;
  modalidade: string;
}

interface FiltrosState {
  cnpj: string;
  uf: string;
  modalidade: string;
  dataInicio: string;
  dataFim: string;
  keywords: string;
}

const UFS = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA",
  "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN",
  "RO", "RR", "RS", "SC", "SE", "SP", "TO",
];

export default function ComprasnetPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [buscando, setBuscando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [testandoCron, setTestandoCron] = useState(false);
  const [resultados, setResultados] = useState<ResultadoBusca[]>([]);
  const [selecionadas, setSelecionadas] = useState<Set<number>>(new Set());
  const [salvarModalOpen, setSalvarModalOpen] = useState(false);

  const [filtros, setFiltros] = useState<FiltrosState>({
    cnpj: "",
    uf: "",
    modalidade: "6",
    dataInicio: "",
    dataFim: "",
    keywords: "",
  });

  async function handleBuscar() {
    setBuscando(true);
    setResultados([]);
    setSelecionadas(new Set());

    try {
      const response = await api.post(
        "/integracoes/comprasnet/buscar",
        {
          cnpj: filtros.cnpj || undefined,
          uf: filtros.uf || undefined,
          modalidade: filtros.modalidade || "6",
          dataInicio: filtros.dataInicio || undefined,
          dataFim: filtros.dataFim || undefined,
          keywords: filtros.keywords || undefined,
        },
        { timeout: 60000 },
      );

      setResultados(response.data.resultados || []);

      if (response.data.total === 0) {
        toast({
          title: "Nenhuma licitação encontrada",
          description: "Tente outros filtros ou um período diferente.",
        });
      } else {
        toast({
          title: `${response.data.total} licitações encontradas`,
          description: "Selecione as que deseja importar.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro na busca",
        description: error.response?.data?.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setBuscando(false);
    }
  }

  async function handleImportar() {
    if (selecionadas.size === 0) return;

    setImportando(true);
    const licitacoesSelecionadas = Array.from(selecionadas).map(
      (i) => resultados[i],
    );

    try {
      const response = await api.post("/integracoes/comprasnet/importar", {
        licitacoes: licitacoesSelecionadas,
      });

      const { importadas, duplicadas } = response.data;

      if (importadas === 0 && duplicadas > 0) {
        toast({
          title: "📋 Nenhuma licitação nova",
          description: `${duplicadas} ${duplicadas === 1 ? "já existia" : "já existiam"} no sistema.`,
          variant: "default",
        });
      } else if (importadas > 0 && duplicadas === 0) {
        toast({
          title: `✅ ${importadas} ${importadas === 1 ? "licitação importada" : "licitações importadas"}!`,
          description: "Acesse a página de licitações para visualizar.",
        });
      } else if (importadas > 0 && duplicadas > 0) {
        toast({
          title: `✅ ${importadas} ${importadas === 1 ? "licitação importada" : "licitações importadas"}!`,
          description: `${duplicadas} ${duplicadas === 1 ? "já existia" : "já existiam"} e ${duplicadas === 1 ? "foi ignorada" : "foram ignoradas"}.`,
        });
      }

      setSelecionadas(new Set());
    } catch {
      toast({ title: "Erro ao importar", variant: "destructive" });
    } finally {
      setImportando(false);
    }
  }

  function toggleSelecionada(index: number) {
    const novo = new Set(selecionadas);
    if (novo.has(index)) {
      novo.delete(index);
    } else {
      novo.add(index);
    }
    setSelecionadas(novo);
  }

  function selecionarTodas() {
    if (selecionadas.size === resultados.length) {
      setSelecionadas(new Set());
    } else {
      setSelecionadas(new Set(resultados.map((_, i) => i)));
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          breadcrumb={[
            { label: "Integrações", href: "/" },
            { label: "Buscas" },
          ]}
          title="Integração PNCP"
          subtitle="Importe licitações do Portal Nacional de Contratações Públicas"
          actions={
            user?.role === "SUPER_ADMIN" ? (
              <Button
                variant="outline"
                size="sm"
                disabled={testandoCron}
                onClick={async () => {
                  try {
                    setTestandoCron(true);
                    await api.post("/integracoes/comprasnet/test-cron");
                    toast({
                      title: "✅ Cron executado!",
                      description: "Verifique os logs do backend e emails.",
                    });
                  } catch {
                    toast({
                      title: "Erro ao executar cron",
                      variant: "destructive",
                    });
                  } finally {
                    setTestandoCron(false);
                  }
                }}
              >
                {testandoCron ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Testar Cron
              </Button>
            ) : undefined
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulário de Busca */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Search className="w-5 h-5" />
                  Buscar Licitações
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Info box */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2 text-sm text-blue-700">
                  <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Busca via API pública do PNCP.</strong> Informe o
                    CNPJ do órgão para busca específica, ou use UF + modalidade
                    para listar propostas abertas.
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>CNPJ do Órgão</Label>
                    <Input
                      placeholder="Ex: 00394502000171"
                      value={filtros.cnpj}
                      onChange={(e) =>
                        setFiltros({
                          ...filtros,
                          cnpj: e.target.value.replace(/\D/g, ""),
                        })
                      }
                      maxLength={14}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      14 dígitos, sem pontuação (opcional)
                    </p>
                  </div>

                  <div>
                    <Label>UF</Label>
                    <Select
                      value={filtros.uf}
                      onValueChange={(v) =>
                        setFiltros({ ...filtros, uf: v === "TODAS" ? "" : v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TODAS">Todas</SelectItem>
                        {UFS.map((uf) => (
                          <SelectItem key={uf} value={uf}>
                            {uf}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Modalidade</Label>
                    <Select
                      value={filtros.modalidade}
                      onValueChange={(v) =>
                        setFiltros({ ...filtros, modalidade: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pregão Eletrônico" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Todas</SelectItem>
                        <SelectItem value="6">Pregão Eletrônico</SelectItem>
                        <SelectItem value="7">Pregão Presencial</SelectItem>
                        <SelectItem value="4">
                          Concorrência Eletrônica
                        </SelectItem>
                        <SelectItem value="5">
                          Concorrência Presencial
                        </SelectItem>
                        <SelectItem value="8">
                          Dispensa de Licitação
                        </SelectItem>
                        <SelectItem value="9">Inexigibilidade</SelectItem>
                        <SelectItem value="12">Credenciamento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Data Início</Label>
                      <Input
                        type="date"
                        value={filtros.dataInicio}
                        onChange={(e) =>
                          setFiltros({
                            ...filtros,
                            dataInicio: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>Data Fim</Label>
                      <Input
                        type="date"
                        value={filtros.dataFim}
                        onChange={(e) =>
                          setFiltros({ ...filtros, dataFim: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Palavras-chave (opcional)</Label>
                  <Input
                    placeholder="Ex: equipamentos, informática, construção"
                    value={filtros.keywords}
                    onChange={(e) =>
                      setFiltros({ ...filtros, keywords: e.target.value })
                    }
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Filtra resultados pelo objeto. Separe por vírgula.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleBuscar}
                    disabled={buscando}
                    className="flex-1"
                  >
                    {buscando ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Buscando no PNCP...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-2" /> Buscar
                      </>
                    )}
                  </Button>

                  {resultados.length > 0 && (
                    <Button
                      variant="outline"
                      onClick={() => setSalvarModalOpen(true)}
                    >
                      <BookmarkPlus className="w-4 h-4 mr-2" />
                      Salvar Busca
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Resultados */}
            {resultados.length > 0 && (
              <Card className="mt-4">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">
                      {resultados.length} licitações encontradas
                      {selecionadas.size > 0 && (
                        <Badge className="ml-2">
                          {selecionadas.size} selecionadas
                        </Badge>
                      )}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={selecionarTodas}
                      >
                        {selecionadas.size === resultados.length
                          ? "Desmarcar todos"
                          : "Selecionar todos"}
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleImportar}
                        disabled={selecionadas.size === 0 || importando}
                      >
                        {importando ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Importando...
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4 mr-2" /> Importar (
                            {selecionadas.size})
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="p-2 w-8">
                            <Checkbox
                              checked={
                                selecionadas.size === resultados.length &&
                                resultados.length > 0
                              }
                              onCheckedChange={() => selecionarTodas()}
                            />
                          </th>
                          <th className="text-left p-2">Número</th>
                          <th className="text-left p-2">Órgão</th>
                          <th className="text-left p-2">Objeto</th>
                          <th className="text-left p-2">Modalidade</th>
                          <th className="text-left p-2">Prazo</th>
                          <th className="p-2">Link</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resultados.map((lic, index) => (
                          <tr
                            key={index}
                            className="border-b hover:bg-gray-50"
                          >
                            <td className="p-2">
                              <Checkbox
                                checked={selecionadas.has(index)}
                                onCheckedChange={() =>
                                  toggleSelecionada(index)
                                }
                              />
                            </td>
                            <td className="p-2 font-mono text-xs font-medium whitespace-nowrap">
                              {lic.numero}
                            </td>
                            <td
                              className="p-2 text-xs max-w-32 truncate"
                              title={lic.orgao}
                            >
                              {lic.orgao}
                            </td>
                            <td className="p-2 text-xs max-w-xs">
                              <span title={lic.objeto}>
                                {lic.objeto?.substring(0, 80)}
                                {lic.objeto?.length > 80 ? "..." : ""}
                              </span>
                            </td>
                            <td className="p-2 text-xs whitespace-nowrap">
                              <Badge variant="outline" className="text-[10px]">
                                {lic.modalidade}
                              </Badge>
                            </td>
                            <td className="p-2 text-xs whitespace-nowrap">
                              {lic.dataLimite || "-"}
                            </td>
                            <td className="p-2 text-center">
                              {lic.linkEdital && (
                                <a
                                  href={lic.linkEdital}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-500 hover:text-blue-700"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Buscas Salvas */}
          <div>
            <BuscasSalvasPanel
              onExecutar={(filtrosSalvos) => {
                setFiltros({
                  cnpj: filtrosSalvos.cnpj || filtrosSalvos.uasg || "",
                  uf: filtrosSalvos.uf || "",
                  modalidade: filtrosSalvos.modalidade || "",
                  dataInicio: filtrosSalvos.dataInicio || "",
                  dataFim: filtrosSalvos.dataFim || "",
                  keywords: filtrosSalvos.keywords || "",
                });
                setResultados([]);
                setSelecionadas(new Set());
                window.scrollTo({ top: 0, behavior: "smooth" });
                toast({
                  title: "✅ Filtros carregados!",
                  description: 'Clique em "Buscar" para executar a busca.',
                });
              }}
            />
          </div>
        </div>
      </div>

      {salvarModalOpen && (
        <SalvarBuscaModal
          filtros={filtros}
          onClose={() => setSalvarModalOpen(false)}
        />
      )}
    </Layout>
  );
}
