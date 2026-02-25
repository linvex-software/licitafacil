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
    BookOpen,
} from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { SalvarBuscaModal } from "@/components/integracoes/salvar-busca-modal";
import { BuscasSalvasPanel } from "@/components/integracoes/buscas-salvas-panel";

interface ResultadoDiario {
    orgao: string;
    objeto: string;
    dataPublicacao: string;
    linkPdf: string;
    uf: string;
    municipio?: string;
    modalidadeNome?: string;
}

interface FiltrosDiario {
    uf: string;
    municipio: string;
    dataInicio: string;
    dataFim: string;
    keywords: string;
}

const UFS = [
    "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA",
    "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN",
    "RO", "RR", "RS", "SC", "SE", "SP", "TO",
];

export default function DiariosPage() {
    const { toast } = useToast();
    const [buscando, setBuscando] = useState(false);
    const [importando, setImportando] = useState(false);
    const [resultados, setResultados] = useState<ResultadoDiario[]>([]);
    const [selecionadas, setSelecionadas] = useState<Set<number>>(new Set());
    const [salvarModalOpen, setSalvarModalOpen] = useState(false);

    const [filtros, setFiltros] = useState<FiltrosDiario>({
        uf: "SP",
        municipio: "",
        dataInicio: "",
        dataFim: "",
        keywords: "",
    });

    async function handleBuscar() {
        if (!filtros.uf) {
            toast({ title: "Selecione a UF!", variant: "destructive" });
            return;
        }

        setBuscando(true);
        setResultados([]);
        setSelecionadas(new Set());

        try {
            const payload = {
                uf: filtros.uf,
                municipio: filtros.municipio || undefined,
                dataInicio: filtros.dataInicio || undefined,
                dataFim: filtros.dataFim || undefined,
                keywords: filtros.keywords ? filtros.keywords.split(',').map(k => k.trim()).filter(k => k) : undefined,
            };

            const response = await api.post("/integracoes/diarios/buscar", payload, {
                timeout: 60000,
            });

            const items = response.data || [];
            setResultados(items);

            if (items.length === 0) {
                toast({
                    title: "Nenhuma licitação encontrada",
                    description: "Pesquisa concluída, mas não houve retorno no Diário Oficial.",
                });
            } else {
                toast({
                    title: `${items.length} publicações encontradas`,
                    description: "Selecione as que deseja importar.",
                });
            }
        } catch (error: any) {
            toast({
                title: "Erro na busca",
                description: error.response?.data?.message || "Ocorreu um erro ao conectar ao Diário. Tente novamente.",
                variant: "destructive",
            });
        } finally {
            setBuscando(false);
        }
    }

    async function handleImportar() {
        if (selecionadas.size === 0) return;

        setImportando(true);
        const licitacoesSelecionadas = Array.from(selecionadas).map((i) => resultados[i]);

        try {
            // Reuses the PNCP import endpoint / logic if feasible, or points to a new one
            const response = await api.post("/integracoes/diarios/importar", {
                licitacoes: licitacoesSelecionadas,
            });

            const { importadas, duplicadas } = response.data || { importadas: licitacoesSelecionadas.length, duplicadas: 0 };

            toast({
                title: `✅ ${importadas} licitações criadas!`,
                description: duplicadas > 0 ? `${duplicadas} foram ignoradas por já existirem.` : "Todas importadas com sucesso.",
            });

            setSelecionadas(new Set());
        } catch {
            toast({ title: "A importação ainda não está mapeada no Back-end final", variant: "default" });
        } finally {
            setImportando(false);
        }
    }

    function toggleSelecionada(index: number) {
        const novo = new Set(selecionadas);
        if (novo.has(index)) novo.delete(index);
        else novo.add(index);
        setSelecionadas(novo);
    }

    function selecionarTodas() {
        if (selecionadas.size === resultados.length) setSelecionadas(new Set());
        else setSelecionadas(new Set(resultados.map((_, i) => i)));
    }

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <BookOpen className="w-6 h-6" />
                            Diários Oficiais
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                            Varredura de editais publicados em jornais e municípios (DOU, DOSP, etc)
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6">
                    <div className="space-y-6">
                        {/* Filtros */}
                        <Card>
                            <CardHeader className="border-b border-gray-100 dark:border-zinc-800 pb-4">
                                <CardTitle className="text-[16px] flex items-center gap-2">
                                    <Search className="w-4 h-4 text-blue-500" />
                                    Filtrar Publicações
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="space-y-2">
                                        <Label>Estado (UF) *</Label>
                                        <Select value={filtros.uf} onValueChange={(v) => setFiltros({ ...filtros, uf: v })}>
                                            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                                            <SelectContent>
                                                {UFS.map((y) => (<SelectItem key={y} value={y}>{y}</SelectItem>))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Município (Opcional)</Label>
                                        <Input
                                            placeholder="Ex: Ribeirão Preto"
                                            value={filtros.municipio}
                                            onChange={(e) => setFiltros({ ...filtros, municipio: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2 lg:col-span-2">
                                        <Label>Palavras-chave (separadas por vírgula)</Label>
                                        <Input
                                            placeholder="Ex: engenharia, limpeza, software"
                                            value={filtros.keywords}
                                            onChange={(e) => setFiltros({ ...filtros, keywords: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Data Inicial</Label>
                                        <Input
                                            type="date"
                                            value={filtros.dataInicio}
                                            onChange={(e) => setFiltros({ ...filtros, dataInicio: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Data Final</Label>
                                        <Input
                                            type="date"
                                            value={filtros.dataFim}
                                            onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value })}
                                        />
                                    </div>

                                    <div className="lg:col-span-4 flex justify-end gap-3 mt-2">
                                        <Button variant="outline" className="gap-2" onClick={() => setSalvarModalOpen(true)}>
                                            <BookmarkPlus className="w-4 h-4" />
                                            Deixar salvo no Robô
                                        </Button>
                                        <Button
                                            onClick={handleBuscar}
                                            disabled={buscando}
                                            className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px]"
                                        >
                                            {buscando ? (
                                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Buscando...</>
                                            ) : (
                                                <><Search className="w-4 h-4 mr-2" /> Buscar no Diário</>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Resultados */}
                        {resultados.length > 0 && (
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-4">
                                    <div className="space-y-1">
                                        <CardTitle className="text-[16px]">Resultados da Busca</CardTitle>
                                        <p className="text-[13px] text-gray-500">
                                            {selecionadas.size} itens selecionados de {resultados.length} encontrados
                                        </p>
                                    </div>
                                    <Button
                                        onClick={handleImportar}
                                        disabled={selecionadas.size === 0 || importando}
                                        className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                                    >
                                        {importando ? (
                                            <><Loader2 className="w-4 h-4 animate-spin" /> Importando...</>
                                        ) : (
                                            <><Download className="w-4 h-4" /> Importar para Licitações</>
                                        )}
                                    </Button>
                                </CardHeader>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50/50 dark:bg-zinc-900/50 border-b border-gray-100 dark:border-zinc-800">
                                            <tr>
                                                <th className="p-4 w-[50px]">
                                                    <Checkbox checked={selecionadas.size === resultados.length && resultados.length > 0} onCheckedChange={selecionarTodas} />
                                                </th>
                                                <th className="p-4 font-semibold text-gray-700 dark:text-gray-300">Órgão / UF</th>
                                                <th className="p-4 font-semibold text-gray-700 dark:text-gray-300">Objeto</th>
                                                <th className="p-4 font-semibold text-gray-700 dark:text-gray-300">Data e Modalidade</th>
                                                <th className="p-4 font-semibold text-gray-700 dark:text-gray-300">PDF</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50 dark:divide-zinc-800/50">
                                            {resultados.map((r, i) => (
                                                <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                                                    <td className="p-4">
                                                        <Checkbox checked={selecionadas.has(i)} onCheckedChange={() => toggleSelecionada(i)} />
                                                    </td>
                                                    <td className="p-4 align-top">
                                                        <p className="font-medium text-gray-900 dark:text-gray-200">{r.orgao}</p>
                                                        <Badge variant="outline" className="mt-1 font-mono text-[10px]">{r.uf} {r.municipio ? `- ${r.municipio}` : ''}</Badge>
                                                    </td>
                                                    <td className="p-4 align-top">
                                                        <p className="text-gray-600 dark:text-gray-400 line-clamp-3 leading-relaxed text-[13px]">{r.objeto}</p>
                                                    </td>
                                                    <td className="p-4 align-top">
                                                        <p className="font-medium text-gray-900 dark:text-gray-200">
                                                            {new Date(r.dataPublicacao).toLocaleDateString("pt-BR")}
                                                        </p>
                                                        {r.modalidadeNome && <Badge variant="secondary" className="mt-1 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0">{r.modalidadeNome}</Badge>}
                                                    </td>
                                                    <td className="p-4 align-top">
                                                        {r.linkPdf ? (
                                                            <a href={r.linkPdf} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-medium text-[13px] hover:underline">
                                                                Acessar Diário <ExternalLink className="w-3.5 h-3.5" />
                                                            </a>
                                                        ) : (
                                                            <span className="text-gray-400 text-[12px]">Sem anexo</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        )}
                    </div>

                    {/* Painel lateral: Buscas Salvas e Status */}
                    <div className="space-y-6">
                        <BuscasSalvasPanel
                            origemBusca="DIARIOS_OFICIAIS"
                            onAplicarBusca={(f) => {
                                setFiltros({
                                    uf: f.uf || "SP",
                                    municipio: f.municipio || "",
                                    dataInicio: f.dataInicio || "",
                                    dataFim: f.dataFim || "",
                                    keywords: (f.keywords || []).join(', '),
                                });
                                toast({ title: "Filtros aplicados", description: `A busca "${f.nome}" foi carregada no formulário.` });
                            }}
                        />
                    </div>
                </div>
            </div>

            <SalvarBuscaModal
                open={salvarModalOpen}
                onOpenChange={setSalvarModalOpen}
                filtrosAtuais={{
                    uf: filtros.uf,
                    municipio: filtros.municipio,
                    dataInicio: filtros.dataInicio,
                    dataFim: filtros.dataFim,
                    keywords: filtros.keywords ? filtros.keywords.split(',').map(k => k.trim()).filter(k => k) : [],
                }}
                totalResultados={resultados.length}
                origemBusca="DIARIOS_OFICIAIS"
            />
        </Layout>
    );
}
