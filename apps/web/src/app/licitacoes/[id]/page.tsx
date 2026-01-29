"use client"

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
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

export default function LicitacaoDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: licitacao, isLoading } = useLicitacao(id);
  const { mutateAsync: updateBid, isPending } = useUpdateBid();
  const { toast } = useToast();

  const handleToggleRisk = async () => {
    if (!licitacao) return;

    // In a real app we'd use the markAtRisk/clearRisk endpoints
    // For now we use the general patch for simplicity in mapping
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

  if (isLoading) {
    return (
      <Layout>
        <div className=" mx-auto space-y-6">
          <div className="h-8 w-32 bg-slate-200 rounded animate-pulse" />
          <div className="h-64 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-32 bg-slate-100 rounded-xl animate-pulse" />
        </div>
      </Layout>
    );
  }

  if (!licitacao) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <h2 className="text-xl font-bold text-slate-900">Licitação não encontrada</h2>
          <Link href="/licitacoes" className="mt-4 text-emerald-600 hover:underline">
            Voltar para lista
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className=" mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/licitacoes">
            <Button variant="ghost" className="pl-0 text-slate-500 hover:text-slate-900 hover:bg-transparent mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para Lista
            </Button>
          </Link>

          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <StatusBadge status={licitacao.operationalState === 'OK' ? 'aberta' : 'vencida'} />
                <span className="text-sm font-mono text-slate-400">ID: {licitacao.id.substring(0, 8)}</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-heading font-bold text-slate-900 max-w-3xl leading-tight">
                {licitacao.title}
              </h1>
              <div className="flex items-center gap-2 mt-4 text-slate-600">
                <Building2 className="w-4 h-4" />
                <span className="font-medium">{licitacao.agency}</span>
              </div>
            </div>

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

        {/* Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-2 shadow-sm border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg font-heading">Detalhes do Processo</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Modalidade</span>
                <p className="font-medium text-slate-900">{licitacao.modality.replace('_', ' ')}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Status Jurídico</span>
                <p className="font-medium text-slate-900 uppercase tracking-tight">{licitacao.legalStatus}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Cadastrado em</span>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <p className="font-medium text-slate-900">
                    {format(new Date(licitacao.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Manual Override</span>
                <p className="font-medium text-slate-900">{licitacao.manualRiskOverride ? "Sim" : "Não"}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200 bg-slate-50">
            <CardHeader>
              <CardTitle className="text-lg font-heading flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                Documentos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-600">
                Edite, envie, baixe e acompanhe os documentos desta licitação.
              </p>
              <Link href={`/licitacoes/${id}/documentos`}>
                <Button variant="outline" className="w-full justify-between group border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50">
                  <span className="flex items-center gap-2">
                    <Download className="w-4 h-4 text-slate-500 group-hover:text-emerald-600" />
                    Ver e baixar documentos
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Ações da licitação: Prazos, Checklist */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <Link href={`/licitacoes/${id}/prazos`}>
            <Card className="shadow-sm border-slate-200 hover:border-emerald-500/50 hover:shadow-md transition-all cursor-pointer group h-full">
              <CardContent className="pt-6 pb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-500/20 transition-colors">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-slate-900 group-hover:text-emerald-700">Prazos</h3>
                    <p className="text-sm text-slate-500">Cadastre e acompanhe os prazos e dias restantes</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-500 shrink-0" />
              </CardContent>
            </Card>
          </Link>
          <Link href={`/licitacoes/${id}/checklist`}>
            <Card className="shadow-sm border-slate-200 hover:border-emerald-500/50 hover:shadow-md transition-all cursor-pointer group h-full">
              <CardContent className="pt-6 pb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-500/20 transition-colors">
                    <ListChecks className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-slate-900 group-hover:text-emerald-700">Checklist</h3>
                    <p className="text-sm text-slate-500">Itens obrigatórios e evidências desta licitação</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-500 shrink-0" />
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Audit / Info Card */}
        {licitacao.operationalState === 'EM_RISCO' && (
          <Card className="border-red-200 bg-red-50 mb-8">
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
                <div>
                  <h4 className="font-bold text-red-900">Motivo do Risco</h4>
                  <p className="text-sm text-red-800 mt-1">
                    {licitacao.riskReason || "Esta licitação foi sinalizada com problemas operacionais ou pendências críticas no checklist."}
                  </p>
                  {licitacao.lastRiskAnalysisAt && (
                    <p className="text-xs text-red-600 mt-2 font-medium">
                      Análise realizada em: {format(new Date(licitacao.lastRiskAnalysisAt), "dd/MM/yyyy HH:mm")}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
