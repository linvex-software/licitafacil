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
  CheckSquare,
  ChevronRight,
  Scale,
  Swords,
  MessageCircle,
  Pencil,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { AnalisarEditalModal } from "@/components/licitacoes/analisar-edital-modal";
import type { AnalisarEditalResponse } from "@/hooks/use-analisar-edital";
import { useBidPrediction, useAnalisarProbabilidade } from "@/hooks/use-bid-prediction";
import { PredictionBadge } from "@/components/licitacoes/prediction-badge";
import { PredictionModal } from "@/components/licitacoes/prediction-modal";
import { PredictiveAnalysis } from "@/components/licitacoes/PredictiveAnalysis";
import { EditarLicitacaoModal } from "@/components/licitacoes/EditarLicitacaoModal";
import type { Bid } from "@licitafacil/shared";

function getStatusBadge(licitacao: Bid) {
  if (licitacao.operationalState === "SUSPENSA") {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-100 px-3 py-1 text-xs font-semibold text-red-600 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
          Suspensa — Recurso em análise
        </span>
        <span className="text-xs text-gray-400">Efeito suspensivo ativo</span>
      </div>
    );
  }

  if (licitacao.isVencedorProvisorio && !licitacao.dataHomologacao) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-400">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        Vencedor Provisório — Aguarda homologação
      </span>
    );
  }

  if (licitacao.dataHomologacao) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 dark:border-green-800/40 dark:bg-green-900/20 dark:text-green-400">
        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
        Homologado
      </span>
    );
  }

  return <StatusBadge status={licitacao.operationalState === "OK" ? "aberta" : "vencida"} />;
}

export default function LicitacaoDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: licitacao, isLoading, refetch } = useLicitacao(id);
  const { mutateAsync: updateBid, isPending } = useUpdateBid();
  const { toast } = useToast();

  // Análise preditiva
  const [predictionModalOpen, setPredictionModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const { data: prediction, isLoading: isPredictionLoading } = useBidPrediction(id);
  const { mutate: analisarProbabilidade, isPending: isAnalyzing } = useAnalisarProbabilidade();
  const temAnaliseEditalValida = Boolean(licitacao?.hasValidEditalAnalysis);
  const quickActions = [
    {
      href: `/licitacoes/${id}/prazos`,
      icon: Clock,
      label: "Prazos",
      description: "Cadastre e acompanhe os prazos e dias restantes",
    },
    {
      href: `/licitacoes/${id}/checklist`,
      icon: CheckSquare,
      label: "Checklist",
      description: "Itens obrigatórios e evidências desta licitação",
    },
    {
      href: `/licitacoes/${id}/juridico`,
      icon: Scale,
      label: "Jurídico",
      description: "Gere petições e acompanhe o histórico jurídico",
    },
    {
      href: `/licitacoes/${id}/disputa`,
      icon: Swords,
      label: "Disputa",
      description: "Simule lances e acompanhe o histórico da disputa",
    },
    {
      href: `/licitacoes/${id}/perguntas`,
      icon: MessageCircle,
      label: "Perguntas",
      description: "Faça perguntas sobre o edital usando IA",
    },
  ];

  const handleAnalisarProbabilidade = () => {
    if (!temAnaliseEditalValida) {
      toast({
        title: "Análise preditiva bloqueada",
        description: "Para obter uma predição precisa, primeiro analise o edital oficial desta licitação.",
        variant: "destructive",
      });
      return;
    }

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
                {getStatusBadge(licitacao)}
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
              <Button
                variant="outline"
                onClick={() => setEditModalOpen(true)}
                className="border-gray-200 dark:border-gray-700 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Pencil className="w-4 h-4 mr-2" />
                Editar
              </Button>
              {/* Badge de probabilidade no header */}
              <button
                onClick={() => {
                  if (prediction || temAnaliseEditalValida) setPredictionModalOpen(true);
                }}
                className="focus:outline-none disabled:opacity-70"
                title={prediction || temAnaliseEditalValida
                  ? "Ver análise preditiva de sucesso"
                  : "Análise preditiva bloqueada até concluir a análise do edital"}
                disabled={!prediction && !temAnaliseEditalValida}
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

        {licitacao.janelaIntencaoRecursoTermino &&
          new Date() < new Date(licitacao.janelaIntencaoRecursoTermino) && (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-800/40 dark:bg-orange-900/10">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" />
              <div>
                <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">
                  Janela de intenção de recurso aberta
                </p>
                <p className="mt-1 text-xs text-orange-600 dark:text-orange-500">
                  O resultado ainda é provisório. Encerra em{" "}
                  <span className="font-mono font-bold">
                    {new Date(licitacao.janelaIntencaoRecursoTermino).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  . Não marque como encerrada até esta janela fechar.
                </p>
              </div>
            </div>
          )}

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
                <span className="text-xs uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider">UF</span>
                <p className="font-medium text-gray-900 dark:text-gray-100">{licitacao.uf}</p>
              </div>
              {licitacao.municipio?.trim() && (
                <div className="space-y-1">
                  <span className="text-xs uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider">Município</span>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{licitacao.municipio}</p>
                </div>
              )}
              <div className="space-y-1">
                <span className="text-xs uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider">Manual Override</span>
                <p className="font-medium text-gray-900 dark:text-gray-100">{licitacao.manualRiskOverride ? "Sim" : "Não"}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-transparent">
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
                <Button variant="outline" className="mt-4 w-full justify-between group border-gray-200 dark:border-gray-700 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/50">
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
        {prediction ? (
          <div className="cursor-pointer" onClick={() => setPredictionModalOpen(true)}>
            <PredictiveAnalysis
              score={prediction.score}
              factors={prediction.fatores}
              processTitle={licitacao.title}
            />
          </div>
        ) : !temAnaliseEditalValida ? (
          <div className="mb-6 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-900/30">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-amber-100 bg-amber-50">
              <span className="text-xl">🔒</span>
            </div>
            <h3 className="mb-1 text-sm font-semibold text-gray-800 dark:text-gray-100">
              Análise Preditiva bloqueada
            </h3>
            <p className="mx-auto mb-4 max-w-xs text-xs text-gray-500 dark:text-gray-400">
              Para acessar a predição de sucesso, primeiro realize a análise do edital desta licitação.
            </p>
            <div className="inline-flex">
              <AnalisarEditalModal
                bidId={id}
                onAplicar={handleAplicarAnalise}
                triggerLabel="Analisar Edital primeiro →"
                triggerVariant="default"
                triggerClassName="rounded-lg bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800"
              />
            </div>
          </div>
        ) : (
          <Card className="mb-6 border-gray-200 shadow-sm dark:border-gray-700">
            <CardContent className="flex items-center justify-between gap-4 py-5">
              <div>
                <h3 className="font-heading text-base font-semibold text-gray-900 dark:text-gray-100">
                  Análise Preditiva de Sucesso
                  <span className="ml-2 text-xs font-medium px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                    Beta
                  </span>
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Gere uma previsão com IA para estimar a chance de sucesso deste processo.
                </p>
              </div>
              <Button onClick={handleAnalisarProbabilidade} disabled={isAnalyzing}>
                {isAnalyzing ? "Analisando..." : (
                  <>
                    Analisar com IA
                    <span className="ml-2 text-xs font-medium px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                      Beta
                    </span>
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Ações rápidas da licitação */}
        <div className="mt-6 mb-8 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group flex flex-col gap-2 rounded-xl border border-gray-100 bg-white p-4 transition-all duration-150 hover:border-[#0078D1]/30 hover:bg-blue-50/30 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-[#0078D1]/30 dark:hover:bg-[#0078D1]/5"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-50 transition-colors group-hover:bg-[#0078D1]/10 dark:bg-gray-800">
                <action.icon className="h-3.5 w-3.5 text-gray-400 transition-colors group-hover:text-[#0078D1]" />
              </div>
              <div>
                <p className="text-xs font-semibold leading-tight text-gray-700 transition-colors group-hover:text-[#0078D1] dark:text-gray-300">
                  {action.label}
                </p>
                <p className="mt-0.5 line-clamp-2 text-sm leading-relaxed text-gray-400 dark:text-gray-500">
                  {action.description}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* Alerta de Risco */}
        {licitacao.operationalState === 'EM_RISCO' && (
          <Card id="risco-operacional" className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 mb-8">
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
      <EditarLicitacaoModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        bid={licitacao}
        onSuccess={() => {
          void refetch();
        }}
      />
    </Layout>
  );
}
