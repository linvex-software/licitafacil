"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ExternalLink, X } from "lucide-react";
import { api, fetchPrazosByBid } from "@/lib/api";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { useToast } from "@/hooks/use-toast";
import { DocumentsList } from "@/components/DocumentsList";
import { ChecklistPageClient } from "@/app/licitacoes/[id]/checklist/ChecklistPageClient";
import { JuridicoTab } from "@/components/juridico/JuridicoTab";
import { PerguntasTab } from "@/components/perguntas/PerguntasTab";

type TabId = "detalhes" | "documentos" | "checklist" | "prazos" | "juridico" | "perguntas";

interface LicitacaoModalProps {
  bidId: string | null;
  onFechar: () => void;
  onAbrirPaginaCompleta: (id: string) => void;
}

interface BidDetalhe {
  id: string;
  title: string;
  agency: string;
  modality: string;
  legalStatus: string;
  operationalState: string;
  createdAt: string;
  updatedAt: string;
  riskReason?: string | null;
  description?: string | null;
  objeto?: string | null;
  valorEstimado?: number | null;
  editalAnalise?: {
    status?: string;
    resultado?: {
      modalidade?: string;
      objeto?: string;
      valorEstimado?: number | null;
      prazos?: Array<{ tipo?: string; data?: string; descricao?: string }>;
      documentos?: Array<{ nome?: string; obrigatorio?: boolean }>;
    };
  } | null;
}

interface PrazoModal {
  id: string;
  titulo: string;
  dataPrazo: string;
  diasRestantes: number | null;
}

const TAB_ITEMS: Array<{ id: TabId; label: string }> = [
  { id: "detalhes", label: "Detalhes" },
  { id: "documentos", label: "Documentos" },
  { id: "checklist", label: "Checklist" },
  { id: "prazos", label: "Prazos" },
  { id: "juridico", label: "Jurídico" },
  { id: "perguntas", label: "Perguntas" },
];

function formatCurrency(value?: number | null) {
  if (typeof value !== "number") return "-";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  try {
    return format(new Date(value), "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch {
    return "-";
  }
}

function formatDiasRestantes(diasRestantes: number | null) {
  if (diasRestantes === null) return "Sem previsão";
  if (diasRestantes < 0) return `Vencido há ${Math.abs(diasRestantes)} dia(s)`;
  if (diasRestantes === 0) return "Vence hoje";
  return `${diasRestantes} dia(s) restantes`;
}

function badgeCriticoClass(diasRestantes: number | null) {
  if (diasRestantes === null) return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  if (diasRestantes <= 3) return "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300";
  if (diasRestantes <= 7) return "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300";
  return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";
}

function PrazosTab({ bidId }: { bidId: string }) {
  const [prazos, setPrazos] = useState<PrazoModal[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const carregar = async () => {
      setLoading(true);
      setErro(null);
      try {
        const data = await fetchPrazosByBid(bidId);
        if (mounted) {
          setPrazos(Array.isArray(data) ? data : []);
        }
      } catch (error: any) {
        if (mounted) {
          setErro(error?.message || "Erro ao carregar prazos");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void carregar();
    return () => {
      mounted = false;
    };
  }, [bidId]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Carregando prazos...</p>;
  }

  if (erro) {
    return <p className="text-sm text-red-600 dark:text-red-400">{erro}</p>;
  }

  if (prazos.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum prazo encontrado para esta licitação.</p>;
  }

  return (
    <div className="space-y-3">
      {prazos.map((prazo) => (
        <div
          key={prazo.id}
          className="rounded-xl border border-border p-4 bg-card flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
        >
          <div>
            <p className="font-semibold text-sm md:text-base">{prazo.titulo}</p>
            <p className="text-xs md:text-sm text-muted-foreground">{formatDate(prazo.dataPrazo)}</p>
          </div>
          <span className={`text-xs font-semibold rounded-full px-2.5 py-1 w-fit ${badgeCriticoClass(prazo.diasRestantes)}`}>
            {formatDiasRestantes(prazo.diasRestantes)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function LicitacaoModal({ bidId, onFechar, onAbrirPaginaCompleta }: LicitacaoModalProps) {
  const { toast } = useToast();
  const [tabAtiva, setTabAtiva] = useState<TabId>("detalhes");
  const [tabsCarregadas, setTabsCarregadas] = useState<Set<TabId>>(new Set(["detalhes"]));
  const [bid, setBid] = useState<BidDetalhe | null>(null);
  const [carregandoBid, setCarregandoBid] = useState(false);
  const [erroBid, setErroBid] = useState<string | null>(null);

  useEffect(() => {
    if (!bidId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFechar();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [bidId, onFechar]);

  useEffect(() => {
    if (!bidId) return;
    setTabAtiva("detalhes");
    setTabsCarregadas(new Set(["detalhes"]));
    setBid(null);
    setErroBid(null);

    let mounted = true;
    const carregarBid = async () => {
      setCarregandoBid(true);
      try {
        const response = await api.get<BidDetalhe>(`/bids/${bidId}`);
        if (mounted) {
          setBid(response.data);
        }
      } catch (error: any) {
        if (mounted) {
          setErroBid(error?.response?.data?.message || "Não foi possível carregar a licitação.");
        }
      } finally {
        if (mounted) {
          setCarregandoBid(false);
        }
      }
    };

    void carregarBid();
    return () => {
      mounted = false;
    };
  }, [bidId]);

  const valorEstimado = useMemo(() => {
    if (!bid) return null;
    return bid.valorEstimado ?? bid.editalAnalise?.resultado?.valorEstimado ?? null;
  }, [bid]);

  const resumoAnalise = useMemo(() => {
    if (!bid?.editalAnalise || bid.editalAnalise.status !== "CONCLUIDA") return null;
    return bid.editalAnalise.resultado || null;
  }, [bid]);

  const handleTrocarTab = (tab: TabId) => {
    setTabAtiva(tab);
    setTabsCarregadas((prev) => new Set([...prev, tab]));
  };

  if (!bidId) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center md:p-4"
      onClick={(e) => e.target === e.currentTarget && onFechar()}
    >
      <div
        className="
          bg-background shadow-2xl flex flex-col overflow-hidden
          w-full h-full rounded-none
          md:w-[90vw] md:h-[90vh] md:rounded-xl
        "
      >
        <div className="border-b border-border px-3 md:px-6 py-3 md:py-4 flex items-start justify-between gap-2 md:gap-4">
          <div className="min-w-0">
            {carregandoBid ? (
              <p className="text-sm text-muted-foreground">Carregando licitação...</p>
            ) : erroBid ? (
              <p className="text-sm text-red-600 dark:text-red-400">{erroBid}</p>
            ) : bid ? (
              <>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <StatusBadge status={bid.operationalState} />
                  <Badge variant="outline" className="font-semibold capitalize">
                    {bid.modality.replaceAll("_", " ").toLowerCase()}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{formatCurrency(valorEstimado)}</span>
                </div>
                <h2 className="font-semibold text-sm md:text-base truncate max-w-[60vw] md:max-w-none">{bid.title}</h2>
                <p className="text-sm text-muted-foreground truncate">{bid.agency}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Sem dados para exibir.</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => bid && onAbrirPaginaCompleta(bid.id)}
              disabled={!bid}
              className="flex items-center gap-1 text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden md:inline">Abrir página completa</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={onFechar} aria-label="Fechar modal">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex overflow-x-auto scrollbar-none border-b border-border">
          {TAB_ITEMS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTrocarTab(tab.id)}
              className={`
                flex-shrink-0 px-3 md:px-4 py-2 text-xs md:text-sm font-medium
                border-b-2 transition-colors whitespace-nowrap
                ${tabAtiva === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-3 md:p-6">
          {(TAB_ITEMS.map((tab) => tab.id) as TabId[]).map((tab) => (
            <div key={tab} className={tabAtiva === tab ? "block h-full" : "hidden"}>
              {tabsCarregadas.has(tab) && (
                <>
                  {tab === "detalhes" && (
                    <div className="space-y-4">
                      {bid ? (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card>
                              <CardContent className="pt-6 space-y-2 text-sm">
                                <p><span className="font-semibold">Modalidade:</span> {bid.modality.replaceAll("_", " ")}</p>
                                <p><span className="font-semibold">Status jurídico:</span> {bid.legalStatus}</p>
                                <p><span className="font-semibold">Criado em:</span> {formatDate(bid.createdAt)}</p>
                                <p><span className="font-semibold">Atualizado em:</span> {formatDate(bid.updatedAt)}</p>
                                <p><span className="font-semibold">Valor estimado:</span> {formatCurrency(valorEstimado)}</p>
                              </CardContent>
                            </Card>
                            <Card>
                              <CardContent className="pt-6 space-y-2 text-sm">
                                <p className="font-semibold">Descrição / Objeto</p>
                                <p className="text-muted-foreground whitespace-pre-wrap">
                                  {bid.description || bid.objeto || resumoAnalise?.objeto || "Não informado."}
                                </p>
                              </CardContent>
                            </Card>
                          </div>

                          {resumoAnalise && (
                            <Card>
                              <CardContent className="pt-6 space-y-2 text-sm">
                                <p className="font-semibold">Resumo da análise do edital (concluída)</p>
                                <p><span className="font-semibold">Modalidade detectada:</span> {resumoAnalise.modalidade || "-"}</p>
                                <p><span className="font-semibold">Valor estimado:</span> {formatCurrency(resumoAnalise.valorEstimado)}</p>
                                <p><span className="font-semibold">Objeto:</span> {resumoAnalise.objeto || "-"}</p>
                              </CardContent>
                            </Card>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">Carregando detalhes...</p>
                      )}
                    </div>
                  )}

                  {tab === "documentos" && bidId && (
                    <DocumentsList
                      bidId={bidId}
                      onError={(mensagem) =>
                        toast({
                          title: "Erro ao carregar documentos",
                          description: mensagem,
                          variant: "destructive",
                        })
                      }
                    />
                  )}

                  {tab === "checklist" && bidId && <ChecklistPageClient licitacaoId={bidId} />}
                  {tab === "prazos" && bidId && <PrazosTab bidId={bidId} />}
                  {tab === "juridico" && bidId && <JuridicoTab bidId={bidId} />}
                  {tab === "perguntas" && bidId && <PerguntasTab bidId={bid?.id ?? bidId} emModal />}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
