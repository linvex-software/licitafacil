"use client";

import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Loader2, TrendingUp, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FunilBoard } from "@/components/negocios/funil/funil-board";

interface Bid {
    id: string;
    title: string;
    agency: string;
    modality: string;
    legalStatus: string;
    operationalState: string;
}

export default function FunilPage() {
    const { toast } = useToast();
    const [bids, setBids] = useState<Bid[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [modality, setModality] = useState("ALL");
    const [period, setPeriod] = useState("ALL");

    useEffect(() => {
        fetchBids();
    }, [search, modality, period]);

    async function fetchBids() {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.append("search", search);
            if (modality && modality !== "ALL") params.append("modality", modality);

            // Handle period
            if (period !== "ALL") {
                const now = new Date();
                const days = parseInt(period, 10);
                const startDate = new Date(now.setDate(now.getDate() - days));
                params.append("startDate", startDate.toISOString());
            }

            params.append("limit", "100"); // Fetching up to 100 for the funnel

            const response = await api.get(`/bids?${params.toString()}`);
            setBids(response.data.data || []);
        } catch (error) {
            toast({
                title: "Erro ao carregar licitações",
                description: "Tente novamente mais tarde.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }

    return (
        <Layout fullWidth>
            <div className="space-y-4 h-[calc(100vh-100px)] flex flex-col">
                {/* Header & Filters */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100">
                            <TrendingUp className="w-6 h-6 text-blue-600" />
                            Funil de Licitações
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                            Arraste e solte as oportunidades para atualizar o status do pipeline.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                            <Input
                                placeholder="Buscar órgão ou objeto..."
                                className="pl-9 w-[250px]"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <Select value={modality} onValueChange={setModality}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Modalidade" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todas</SelectItem>
                                <SelectItem value="PREGAO_ELETRONICO">Pregão Eletrônico</SelectItem>
                                <SelectItem value="CONCORRENCIA">Concorrência</SelectItem>
                                <SelectItem value="DISPENSA">Dispensa</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={period} onValueChange={setPeriod}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="Período" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todo período</SelectItem>
                                <SelectItem value="7">Últimos 7 dias</SelectItem>
                                <SelectItem value="30">Últimos 30 dias</SelectItem>
                                <SelectItem value="90">Últimos 90 dias</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Board Area */}
                <div className="flex-1 p-1 overflow-x-auto custom-scrollbar">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                        </div>
                    ) : (
                        <FunilBoard initialBids={bids} />
                    )}
                </div>
            </div>
        </Layout>
    );
}
