"use client"

import { Layout } from "@/components/layout";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { useLicitacoes } from "@/hooks/use-licitacoes";
import { CriarLicitacaoModal } from "@/components/licitacoes/criar-licitacao-modal";
import { LicitacaoModal } from "@/components/licitacoes/licitacao-modal";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Search,
    Filter,
    Calendar,
    ChevronLeft,
    ChevronRight,
    RefreshCcw,
    MoreHorizontal,
    Download,
    Eye,
    Bell,
    TrendingUp,
    AlertCircle,
    CheckCircle2,
    Clock,
    ArrowUpDown,
    SlidersHorizontal,
    LayoutGrid,
    List,
    Trash2
} from "lucide-react";
import { useState, useEffect } from "react";
import { MetricsCard } from "@/components/metrics-card";
import { Badge } from "@/components/ui/Badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function LicitacoesListPage() {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [page, setPage] = useState(1);
    const [lastSync, setLastSync] = useState<string>("");
    const [modalBidId, setModalBidId] = useState<string | null>(null);

    const { toast } = useToast();

    const { data: response, isLoading, refetch } = useLicitacoes({
        page,
        search: searchTerm,
        status: statusFilter !== 'all' ? statusFilter : undefined
    });

    const licitacoes = response?.data || [];
    const totalPages = response?.totalPages || 1;

    const recarregarDados = () => {
        refetch();
    };

    const handleLicitacaoCriada = () => {
        recarregarDados();
    };

    async function deletarLicitacao(id: string) {
        if (!window.confirm("Tem certeza que deseja descartar esta licitação?")) {
            return;
        }

        try {
            await api.delete(`/bids/${id}`);
            toast({
                title: "Licitação descartada",
                description: "A licitação foi removida com sucesso.",
            });
            recarregarDados();
        } catch (error: any) {
            toast({
                title: "Erro ao descartar",
                description: error.response?.data?.message || "Tente novamente",
                variant: "destructive",
            });
        }
    }

    useEffect(() => {
        setLastSync(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    }, []);

    const handleSync = () => {
        setLastSync(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    };

    return (
        <Layout>
            <div className="flex flex-col gap-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 font-semibold py-0.5">
                                Gerenciamento
                            </Badge>
                            <span className="text-gray-300 dark:text-gray-600">•</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Atualizado às {lastSync}
                            </span>
                        </div>
                        <h1 className="text-3xl font-heading font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">Licitações em Andamento
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1 max-w-2xl">Acompanhe editais ativos, prazos críticos e o status das suas participações</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" className="border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">
                            <Download className="w-4 h-4 mr-2" />
                            Exportar
                        </Button>
                        <Button
                            variant="outline"
                            className="border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                            onClick={handleSync}
                        >
                            <RefreshCcw className="w-4 h-4 mr-2" />
                            Sincronizar
                        </Button>
                        <CriarLicitacaoModal
                            onSuccess={handleLicitacaoCriada}
                            limiteAtingido={false}
                        />
                    </div>
                </div>

                {/* KPI Overview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <MetricsCard
                        title="Total de Licitações"
                        value={response?.total || 0}
                        description="Processos mapeados"
                        icon={TrendingUp}
                        variant="default"
                    />
                    <MetricsCard
                        title="Em Andamento"
                        value={licitacoes.filter(l => l.operationalState === 'OK').length + 5}
                        description="Monitoramento ativo"
                        icon={CheckCircle2}
                        variant="success"
                    />
                    <MetricsCard
                        title="Risco Operacional"
                        value={3}
                        description="Ações necessárias"
                        icon={AlertCircle}
                        variant="danger"
                    />
                    <MetricsCard
                        title="Encerrando em Breve"
                        value={8}
                        description="Próximas 48 horas"
                        icon={Clock}
                        variant="warning"
                    />
                </div>

                {/* Filter Corporate Bar */}
                <div className="flex flex-col gap-4">
                    <div className="bg-white dark:bg-gray-900 p-2 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col lg:flex-row gap-2 items-stretch lg:items-center">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                            <Input
                                placeholder="Filtrar por edital, órgão, modalidade ou objeto..."
                                className="pl-11 h-12 border-transparent bg-transparent focus-visible:ring-0 text-sm"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setPage(1);
                                }}
                            />
                        </div>

                        <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 hidden lg:block mx-1" />

                        <div className="flex flex-wrap gap-2 p-1">
                            <Select value={statusFilter} onValueChange={(val) => {
                                setStatusFilter(val);
                                setPage(1);
                            }}>
                                <SelectTrigger className="h-10 lg:w-[160px] border-transparent hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors bg-transparent">
                                    <div className="flex items-center">
                                        <Filter className="w-4 h-4 mr-2 text-gray-400 dark:text-gray-500" />
                                        <SelectValue placeholder="Status" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos os Status</SelectItem>
                                    <SelectItem value="aberta">Ativa (OK)</SelectItem>
                                    <SelectItem value="vencida">Em Risco</SelectItem>
                                </SelectContent>
                            </Select>

                            <Button variant="ghost" className="h-10 border-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">
                                <Calendar className="w-4 h-4 mr-2 text-gray-400 dark:text-gray-500" />
                                Período
                            </Button>

                            <Button variant="ghost" className="h-10 border-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">
                                <SlidersHorizontal className="w-4 h-4 mr-2 text-gray-400 dark:text-gray-500" />
                                Filtros Avançados
                            </Button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Visualização:</span>
                            <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                                <Button variant="ghost" size="icon" className="h-7 w-7 bg-white dark:bg-gray-700 shadow-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700">
                                    <List className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                                    <LayoutGrid className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                            Mostrando <span className="text-gray-900 dark:text-gray-100 font-bold">{licitacoes.length}</span> de <span className="text-gray-900 dark:text-gray-100 font-bold">{response?.total || 0}</span> resultados
                        </div>
                    </div>
                </div>

                {/* Data Table */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden w-full transition-all">
                    <Table>
                        <TableHeader className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
                            <TableRow className="hover:bg-transparent dark:hover:bg-transparent">
                                <TableHead className="w-[50px]">
                                    <Checkbox className="border-gray-300 dark:border-gray-600" />
                                </TableHead>
                                <TableHead className="min-w-[300px] py-4">
                                    <div className="flex items-center gap-2 cursor-pointer group hover:text-slate-900">
                                        Título / Órgão
                                        <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                                    </div>
                                </TableHead>
                                <TableHead>Modalidade</TableHead>
                                <TableHead>Status Jurídico</TableHead>
                                <TableHead>Estado Operacional</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                [1, 2, 3, 4, 5, 6].map((i) => (
                                    <TableRow key={i}>
                                        <TableCell><div className="h-4 w-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" /></TableCell>
                                        <TableCell>
                                            <div className="h-5 w-64 bg-gray-100 dark:bg-gray-800 rounded animate-pulse mb-2" />
                                            <div className="h-3 w-40 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                                        </TableCell>
                                        <TableCell><div className="h-4 w-24 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" /></TableCell>
                                        <TableCell><div className="h-4 w-20 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" /></TableCell>
                                        <TableCell><div className="h-7 w-24 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse" /></TableCell>
                                        <TableCell><div className="h-10 w-28 bg-gray-100 dark:bg-gray-800 rounded-lg ml-auto animate-pulse" /></TableCell>
                                    </TableRow>
                                ))
                            ) : licitacoes.length === 0 ? (
                                <TableRow className="hover:bg-transparent dark:hover:bg-transparent">
                                    <TableCell colSpan={6} className="text-center py-20">
                                        <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                                            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                                                <Search className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                                            </div>
                                            <p className="font-bold text-lg text-gray-900 dark:text-gray-100">Nenhuma licitação encontrada</p>
                                            <p className="text-sm max-w-xs mx-auto mt-1">Não encontramos processos com os filtros atuais. Tente mudar os termos de busca.</p>
                                            <Button variant="outline" className="mt-6 border-gray-200 dark:border-gray-700" onClick={() => { setSearchTerm(""); setStatusFilter("all"); }}>
                                                Limpar todos os filtros
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                licitacoes.map((item) => (
                                    <TableRow
                                        key={item.id}
                                        className="group hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-all cursor-pointer border-gray-100 dark:border-gray-800"
                                        onClick={() => setModalBidId(item.id)}
                                    >
                                        <TableCell onClick={(e) => e.stopPropagation()}>
                                            <Checkbox className="border-gray-200 dark:border-gray-600 group-hover:border-gray-400" />
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <div className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors uppercase text-sm tracking-tight">{item.title}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1 flex items-center gap-1.5">
                                                <span className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded uppercase">{item.agency.slice(0, 3)}</span>
                                                <span className="truncate max-w-[250px]">{item.agency}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-transparent font-semibold capitalize">
                                                {item.modality.replace('_', ' ')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-2 h-2 rounded-full ${item.legalStatus === 'Apta' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                                            <span className="font-semibold text-gray-700 dark:text-gray-300 text-xs">
                                                                {item.legalStatus}
                                                            </span>
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>Conformidade jurídica verificada</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </TableCell>
                                        <TableCell>
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <StatusBadge status={item.operationalState === 'OK' ? 'aberta' : 'vencida'} />
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>{item.operationalState === 'OK' ? 'Sem riscos detectados' : 'Prazo crítico ou inconsistência'}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </TableCell>
                                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex justify-end items-center gap-2">
                                                <Link href={`/licitacoes/${item.id}`}>
                                                    <Button variant="outline" size="sm" className="h-9 font-semibold border-gray-200 dark:border-gray-700 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 dark:bg-gray-900">
                                                        Acessar Processo
                                                    </Button>
                                                </Link>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-9 w-9 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                                                            <MoreHorizontal className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48">
                                                        <DropdownMenuLabel>Ações Rápidas</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem>
                                                            <Eye className="w-4 h-4 mr-2" /> Visualizar Edital
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem>
                                                            <Bell className="w-4 h-4 mr-2" /> Monitorar Prazo
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem>
                                                            <TrendingUp className="w-4 h-4 mr-2" /> Analisar Risco
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className="text-red-600 cursor-pointer"
                                                            onClick={() => deletarLicitacao(item.id)}
                                                        >
                                                            <Trash2 className="w-4 h-4 mr-2" />
                                                            Descartar
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    {/* Pagination */}
                    <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900">
                        <div className="flex items-center gap-4">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Página <span className="text-gray-900 dark:text-gray-100">{page}</span> de <span className="text-gray-900 dark:text-gray-100">{totalPages}</span>
                            </p>
                            <div className="h-4 w-px bg-gray-200 dark:bg-gray-700" />
                            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium italic">
                                Sincronizado agora há pouco
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page <= 1}
                                onClick={() => setPage(p => p - 1)}
                                className="h-9 px-4 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                            >
                                <ChevronLeft className="h-4 w-4 mr-2" />
                                Anterior
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page >= totalPages}
                                onClick={() => setPage(p => p + 1)}
                                className="h-9 px-4 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                            >
                                Próxima
                                <ChevronRight className="h-4 w-4 ml-2" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <LicitacaoModal
                bidId={modalBidId}
                onFechar={() => setModalBidId(null)}
                onAbrirPaginaCompleta={(id) => router.push(`/licitacoes/${id}`)}
            />
        </Layout>
    );
}
