"use client"

import { useState } from "react";
import { Layout } from "@/components/layout";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useLicitacao, useUpdateBid } from "@/hooks/use-licitacoes";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Calendar,
  FileText,
  Download,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ListChecks,
  ChevronRight,
  Scale,
  Swords,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { AnalisarEditalModal } from "@/components/licitacoes/analisar-edital-modal";
import type { AnalisarEditalResponse } from "@/hooks/use-analisar-edital";
import { useBidPrediction, useAnalisarProbabilidade } from "@/hooks/use-bid-prediction";
import { PredictionBadge } from "@/components/licitacoes/prediction-badge";
import { PredictionModal } from "@/components/licitacoes/prediction-modal";

export default function LicitacaoDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: licitacao, isLoading } = useLicitacao(id);
  const { mutateAsync: updateBid, isPending } = useUpdateBid();
  const { toast } = useToast();

  // Análise preditiva
  const [predictionModalOpen, setPredictionModalOpen] = useState(false);
  const { data: prediction, isLoading: isPredictionLoading } = useBidPrediction(id);
  const { mutate: analisarProbabilidade, isPending: isAnalyzing } = useAnalisarProbabilidade();

  const handleAnalisarProbabilidade = () => {
    analisarProbabilidade(id, {
      onSuccess: () => {
        toast({
          title: "Análise concluída",
          description: "A probabilidade de sucesso foi calculada com sucesso.",
        });
      },
      onError: (err: any) => {
        toast({
          title: "Erro na análise",
          description: err?.response?.data?.message || "Não foi possível analisar. Tente novamente.",
          variant: "destructive",
        });
      },
    });
  };

  const handleToggleRisk = async () => {
    if (!licitacao) return;

    try {
      const newState = licitacao.operationalState === 'OK' ? 'EM_RISCO' : 'OK';
      await updateBid({
        id,
        data: { operationalState: newState as any }
      });

      toast({
        title: "Status atualizado",
        description: `Licitação marcada como ${newState}.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAplicarAnalise = (dados: AnalisarEditalResponse) => {
    if (!licitacao) return;

    const mapModalidade = (modalidadeIA: string): string => {
      const mapa: Record<string, string> = {
        PREGAO_ELETRONICO: "PREGAO_ELETRONICO",
        PREGAO_PRESENCIAL: "PREGAO_ELETRONICO",
        CONCORRENCIA: "CONCORRENCIA",
        TOMADA_PRECOS: "CONCORRENCIA",
        CONVITE: "DISPENSA",
        DISPENSA: "DISPENSA",
        INEXIGIBILIDADE: "DISPENSA",
      };
      return mapa[modalidadeIA] || "OUTRA";
    };

    const updateData: Record<string, any> = {};

    if (dados.modalidade) {
      updateData.modality = mapModalidade(dados.modalidade);
    }
    if (dados.objeto) {
      updateData.title = dados.objeto;
    }

    if (Object.keys(updateData).length > 0) {
      updateBid({ id, data: updateData as any }).then(() => {
        toast({
          title: "Dados aplicados com sucesso",
          description: `Modalidade e título atualizados.${dados.valorEstimado ? ` Valor estimado: R$ ${dados.valorEstimado.toLocaleString("pt-BR")}` : ""}`,
        });
      }).catch((err: any) => {
        toast({
          title: "Erro ao aplicar dados",
          description: err?.response?.data?.message || "Não foi possível salvar. Tente novamente.",
          variant: "destructive",
        });
      });
    } else {
      toast({
        title: "Nenhum dado para aplicar",
        description: "A análise não retornou dados compatíveis com os campos da licitação.",
      });
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="mx-auto space-y-6">
          <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
        </div>
      </Layout>
    );
  }

  if (!licitacao) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Licitação não encontrada</h2>
          <Link href="/licitacoes" className="mt-4 text-emerald-600 dark:text-emerald-400 hover:underline">
            Voltar para lista
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/licitacoes">
            <Button variant="ghost" className="pl-0 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-transparent mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para Lista
            </Button>
          </Link>

          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <StatusBadge status={licitacao.operationalState === 'OK' ? 'aberta' : 'vencida'} />
                <span className="text-sm font-mono text-gray-400 dark:text-gray-500">ID: {licitacao.id.substring(0, 8)}</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-heading font-bold text-gray-900 dark:text-gray-100 max-w-3xl leading-tight">
                {licitacao.title}
              </h1>
              <div className="flex items-center gap-2 mt-4 text-gray-600 dark:text-gray-400">
                <Building2 className="w-4 h-4" />
                <span className="font-medium">{licitacao.agency}</span>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap items-center">
              {/* Badge de probabilidade no header */}
              <button
                onClick={() => setPredictionModalOpen(true)}
                className="focus:outline-none"
                title="Ver análise preditiva de sucesso"
              >
                <PredictionBadge
                  prediction={prediction}
                  isLoading={isPredictionLoading}
                  size="md"
                  showLabel
                />
              </button>

              <AnalisarEditalModal
                bidId={id}
                onAplicar={handleAplicarAnalise}
              />
              <Button
                size="lg"
                variant={licitacao.operationalState === 'OK' ? "outline" : "destructive"}
                onClick={handleToggleRisk}
                disabled={isPending}
                className="shadow-lg"
              >
                {licitacao.operationalState === 'OK' ? (
                  <>
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Sinalizar Risco
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Resolver Risco
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-2 shadow-sm border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg font-heading">Detalhes do Processo</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <span className="text-xs uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider">Modalidade</span>
                <p className="font-medium text-gray-900 dark:text-gray-100">{licitacao.modality.replace('_', ' ')}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider">Status Jurídico</span>
                <p className="font-medium text-gray-900 dark:text-gray-100 uppercase tracking-tight">{licitacao.legalStatus}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider">Cadastrado em</span>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {format(new Date(licitacao.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-xs uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider">Manual Override</span>
                <p className="font-medium text-gray-900 dark:text-gray-100">{licitacao.manualRiskOverride ? "Sim" : "Não"}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="text-lg font-heading flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Documentos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Edite, envie, baixe e acompanhe os documentos desta licitação.
              </p>
              <Link href={`/licitacoes/${id}/documentos`}>
                <Button variant="outline" className="w-full justify-between group border-gray-200 dark:border-gray-700 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/50">
                  <span className="flex items-center gap-2">
                    <Download className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400" />
                    Ver e baixar documentos
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Card de Análise Preditiva */}
        <Card
          className="shadow-sm border-gray-200 dark:border-gray-700 hover:border-purple-500/50 hover:shadow-md transition-all cursor-pointer group mb-6"
          onClick={() => setPredictionModalOpen(true)}
        >
          <CardContent className="pt-5 pb-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:bg-purple-500/20 transition-colors">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-gray-900 dark:text-gray-100 group-hover:text-purple-700 dark:group-hover:text-purple-400">
                  Análise Preditiva de Sucesso
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {prediction
                    ? `Score: ${prediction.score}/100 — ${prediction.recomendacao}`
                    : "Calcule a probabilidade de sucesso com IA (6 fatores)"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <PredictionBadge
                prediction={prediction}
                isLoading={isPredictionLoading}
                size="sm"
                showLabel={false}
              />
              <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-purple-500 shrink-0" />
            </div>
          </CardContent>
        </Card>

        {/* Ações da licitação: Prazos, Checklist, etc. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Link href={`/licitacoes/${id}/prazos`}>
            <Card className="shadow-sm border-gray-200 dark:border-gray-700 hover:border-emerald-500/50 hover:shadow-md transition-all cursor-pointer group h-full">
              <CardContent className="pt-6 pb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-gray-900 dark:text-gray-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400">Prazos</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Cadastre e acompanhe os prazos e dias restantes</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-emerald-500 shrink-0" />
              </CardContent>
            </Card>
          </Link>
          <Link href={`/licitacoes/${id}/checklist`}>
            <Card className="shadow-sm border-gray-200 dark:border-gray-700 hover:border-emerald-500/50 hover:shadow-md transition-all cursor-pointer group h-full">
              <CardContent className="pt-6 pb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                    <ListChecks className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-gray-900 dark:text-gray-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400">Checklist</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Itens obrigatórios e evidências desta licitação</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-emerald-500 shrink-0" />
              </CardContent>
            </Card>
          </Link>
          <Link href={`/licitacoes/${id}/juridico`}>
            <Card className="shadow-sm border-gray-200 dark:border-gray-700 hover:border-emerald-500/50 hover:shadow-md transition-all cursor-pointer group h-full">
              <CardContent className="pt-6 pb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                    <Scale className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-gray-900 dark:text-gray-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400">Jurídico</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Gere petições e acompanhe o histórico jurídico</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-emerald-500 shrink-0" />
              </CardContent>
            </Card>
          </Link>
          <Link href={`/licitacoes/${id}/disputa`}>
            <Card className="shadow-sm border-gray-200 dark:border-gray-700 hover:border-emerald-500/50 hover:shadow-md transition-all cursor-pointer group h-full">
              <CardContent className="pt-6 pb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                    <Swords className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-gray-900 dark:text-gray-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400">Disputa</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Simule lances e acompanhe o histórico da disputa</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-emerald-500 shrink-0" />
              </CardContent>
            </Card>
          </Link>
          <Link href={`/licitacoes/${id}/perguntas`}>
            <Card className="shadow-sm border-gray-200 dark:border-gray-700 hover:border-emerald-500/50 hover:shadow-md transition-all cursor-pointer group h-full">
              <CardContent className="pt-6 pb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                    <MessageCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-gray-900 dark:text-gray-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400">Perguntas</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Faça perguntas sobre o edital usando IA</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-emerald-500 shrink-0" />
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Alerta de Risco */}
        {licitacao.operationalState === 'EM_RISCO' && (
          <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 mb-8">
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400 shrink-0" />
                <div>
                  <h4 className="font-bold text-red-900 dark:text-red-300">Motivo do Risco</h4>
                  <p className="text-sm text-red-800 dark:text-red-400 mt-1">
                    {licitacao.riskReason || "Esta licitação foi sinalizada com problemas operacionais ou pendências críticas no checklist."}
                  </p>
                  {licitacao.lastRiskAnalysisAt && (
                    <p className="text-xs text-red-600 dark:text-red-500 mt-2 font-medium">
                      Análise realizada em: {format(new Date(licitacao.lastRiskAnalysisAt), "dd/MM/yyyy HH:mm")}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal de Análise Preditiva */}
      <PredictionModal
        open={predictionModalOpen}
        onClose={() => setPredictionModalOpen(false)}
        prediction={prediction}
        isLoading={isPredictionLoading}
        isAnalyzing={isAnalyzing}
        onAnalisar={handleAnalisarProbabilidade}
        bidTitle={licitacao.title}
      />
    </Layout>
  );
}
