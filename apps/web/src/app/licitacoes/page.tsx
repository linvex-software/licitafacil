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
    Trash2,
    Pencil
} from "lucide-react";
import { useState, useEffect } from "react";
import { MetricsCard } from "@/components/metrics-card";
import { Badge } from "@/components/ui/Badge";
import { useBidPrediction } from "@/hooks/use-bid-prediction";
import { useBidOverviewStats } from "@/hooks/use-licitacoes";
import { PredictionBadge } from "@/components/licitacoes/prediction-badge";
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
import { AuthGuard } from "@/components/AuthGuard";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

/**
 * Célula de predição para cada linha da tabela.
 * Componente separado para poder usar o hook useBidPrediction por bid.
 */
function PredictionCell({ bidId }: { bidId: string }) {
    const { data: prediction, isLoading } = useBidPrediction(bidId);
    return (
        <PredictionBadge
            prediction={prediction}
            isLoading={isLoading}
            size="sm"
            showLabel={false}
        />
    );
}

export default function LicitacoesListPage() {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [page, setPage] = useState(1);
    const [lastSync, setLastSync] = useState<string>("");
    const [modalBidId, setModalBidId] = useState<string | null>(null);
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const { toast } = useToast();

    const { data: response, isLoading, refetch } = useLicitacoes({
        page,
        search: searchTerm,
        status: statusFilter !== 'all' ? statusFilter : undefined
    });

    const { data: overviewStats, refetch: refetchStats } = useBidOverviewStats();

    const licitacoes = response?.data || [];
    const totalPages = response?.totalPages || 1;

    const recarregarDados = () => {
        refetch();
        refetchStats();
    };

    const handleLicitacaoCriada = () => {
        recarregarDados();
    };

    async function deletarLicitacao(id: string) {
        setIsDeleting(true);
        try {
            await api.delete(`/bids/${id}`);
            toast({
                title: "Licitação excluída",
                description: "A licitação foi removida permanentemente com sucesso.",
            });
            recarregarDados();
            setDeleteTargetId(null);
        } catch (error: any) {
            toast({
                title: "Erro ao excluir",
                description: error.response?.data?.message || "Tente novamente",
                variant: "destructive",
            });
        } finally {
            setIsDeleting(false);
        }
    }

    useEffect(() => {
        setLastSync(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    }, []);

    const handleSync = async () => {
        try {
            await Promise.all([refetch(), refetchStats()]);
            setLastSync(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
            toast({
                title: "Sincronizado",
                description: "Os dados foram atualizados com sucesso.",
            });
        } catch (error) {
            toast({
                title: "Erro na sincronização",
                description: "Não foi possível atualizar os dados.",
                variant: "destructive",
            });
        }
    };

    const handleExport = () => {
        if (!licitacoes || licitacoes.length === 0) {
            toast({
                title: "Nada para exportar",
                description: "Não há licitações nesta página para exportar.",
                variant: "destructive"
            });
            return;
        }

        const headers = ["Número/Edital", "Órgão", "Modalidade", "Status", "Data Limite"];

        const csvContent = [
            headers.join(";"),
            ...licitacoes.map(l => {
                const numeroEdital = l.title || "---";
                const orgao = l.agency || "---";
                const modalidade = l.modality || "---";
                const status = l.legalStatus || "---";
                const dataLimite = l.createdAt ? new Date(l.createdAt).toLocaleDateString('pt-BR') : "---";

                return [numeroEdital, orgao, modalidade, status, dataLimite]
                    .map(str => `"${str.replace(/"/g, '""')}"`) // Escape quotes
                    .join(";");
            })
        ].join("\n");

        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `licitacoes_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <AuthGuard>
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
                        <div className="flex w-full md:w-auto items-center gap-3 flex-wrap">
                            <Button
                                variant="outline"
                                className="border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                                onClick={handleExport}
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Exportar
                            </Button>
                            <Button
                                variant="outline"
                                className="border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
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
                            value={overviewStats?.total || 0}
                            description="Processos mapeados"
                            icon={TrendingUp}
                            variant="default"
                        />
                        <MetricsCard
                            title="Em Andamento"
                            value={overviewStats?.emAndamento || 0}
                            description="Monitoramento ativo"
                            icon={CheckCircle2}
                            variant="success"
                        />
                        <MetricsCard
                            title="Risco Operacional"
                            value={overviewStats?.emRisco || 0}
                            description="Ações necessárias"
                            icon={AlertCircle}
                            variant="danger"
                        />
                        <MetricsCard
                            title="Encerrando em Breve"
                            value={overviewStats?.encerrandoEmBreve || 0}
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

                            </div>
                        </div>

                        <div className="flex items-center justify-between px-2">
                            <div />
                            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                Mostrando <span className="text-gray-900 dark:text-gray-100 font-bold">{licitacoes.length}</span> de <span className="text-gray-900 dark:text-gray-100 font-bold">{response?.total || 0}</span> resultados
                            </div>
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-x-auto w-full transition-all">
                        <Table className="min-w-[980px]">
                            <TableHeader className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
                                <TableRow className="hover:bg-transparent dark:hover:bg-transparent">
                                    <TableHead className="w-[50px]">
                                        <Checkbox className="border-gray-300 dark:border-gray-600" />
                                    </TableHead>
                                    <TableHead className="min-w-[300px] py-4">
                                        <div className="flex items-center gap-2 cursor-pointer group text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                                            Título / Órgão
                                            <ArrowUpDown className="w-3 h-3 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
                                        </div>
                                    </TableHead>
                                    <TableHead>Modalidade</TableHead>
                                    <TableHead>Status Jurídico</TableHead>
                                    <TableHead>Estado Operacional</TableHead>
                                    <TableHead>Predição IA</TableHead>
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
                                            <TableCell><div className="h-6 w-16 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse" /></TableCell>
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
                                                <div className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-[#0078D1] transition-colors uppercase text-sm tracking-tight">{item.title}</div>
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
                                            <TableCell onClick={(e) => e.stopPropagation()}>
                                                <Link href={`/licitacoes/${item.id}`} title="Ver análise preditiva completa">
                                                    <PredictionCell bidId={item.id} />
                                                </Link>
                                            </TableCell>
                                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex justify-end items-center gap-2">
                                                    <Link href={`/licitacoes/${item.id}`}>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-9 font-semibold border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:text-[#0078D1] hover:bg-gray-50 dark:hover:bg-gray-700/50 bg-white dark:bg-transparent"
                                                        >
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
                                                            <DropdownMenuItem onClick={() => setModalBidId(item.id)}>
                                                                <Pencil className="w-4 h-4 mr-2" /> Editar Licitação
                                                            </DropdownMenuItem>
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
                                                                onClick={() => setDeleteTargetId(item.id)}
                                                            >
                                                                <Trash2 className="w-4 h-4 mr-2" />
                                                                Excluir permanentemente
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
                        <div className="px-4 md:px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex flex-col md:flex-row items-start md:items-center gap-3 md:justify-between bg-white dark:bg-gray-900">
                            <div className="flex items-center gap-4 flex-wrap">
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
                                    className="h-9 px-4 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40"
                                >
                                    <ChevronLeft className="h-4 w-4 mr-2" />
                                    Anterior
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={page >= totalPages}
                                    onClick={() => setPage(p => p + 1)}
                                    className="h-9 px-4 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40"
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

                <Dialog open={!!deleteTargetId} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Excluir licitação</DialogTitle>
                            <DialogDescription>
                                Tem certeza que deseja excluir esta licitação? Esta ação não pode ser desfeita.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setDeleteTargetId(null)}
                                disabled={isDeleting}
                            >
                                Cancelar
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() => deleteTargetId && deletarLicitacao(deleteTargetId)}
                                disabled={isDeleting}
                            >
                                {isDeleting ? "Excluindo..." : "Excluir permanentemente"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </Layout>
        </AuthGuard>
    );
}
