"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getHistoricoSimulacoes,
  simularLance,
  type SimulacaoDisputa,
  type SimularLanceInput,
  type SimulacaoResult,
} from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface SimuladorDisputaProps {
  bidId?: string;
  autoSave?: boolean;
  showSaveButton?: boolean;
  showHistorico?: boolean;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function calcularSimulacao(
  valorInicial: number,
  percentualDesconto: number,
  numConcorrentes: number,
): SimulacaoResult {
  const lanceMinimo = valorInicial * (1 - percentualDesconto / 100);
  const lanceConservador = valorInicial * (1 - (percentualDesconto / 100) * 1.5);
  const lanceAgressivo = valorInicial * (1 - (percentualDesconto / 100) * 2);
  const fatorConcorrencia = 1 + (numConcorrentes - 1) * 0.01;
  const lanceSugerido = lanceConservador / fatorConcorrencia;

  return {
    lanceSugerido: round2(lanceSugerido),
    lanceMinimo: round2(lanceMinimo),
    lanceAgressivo: round2(lanceAgressivo),
    economia: round2(valorInicial - lanceSugerido),
    percentualEconomia: round2((1 - lanceSugerido / valorInicial) * 100),
  };
}

export function SimuladorDisputa({
  bidId,
  autoSave = false,
  showSaveButton = false,
  showHistorico = false,
}: SimuladorDisputaProps) {
  const [valorInicial, setValorInicial] = useState<string>("");
  const [percentualDesconto, setPercentualDesconto] = useState<number>(5);
  const [numConcorrentes, setNumConcorrentes] = useState<number>(3);
  const [isSaving, setIsSaving] = useState(false);
  const [historico, setHistorico] = useState<SimulacaoDisputa[]>([]);
  const [isLoadingHistorico, setIsLoadingHistorico] = useState(false);
  const lastSavedPayloadRef = useRef<string>("");
  const { toast } = useToast();

  const valorInicialNumber = useMemo(() => {
    const normalized = valorInicial.replace(/\./g, "").replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : NaN;
  }, [valorInicial]);

  const resultado = useMemo(() => {
    if (!Number.isFinite(valorInicialNumber) || valorInicialNumber <= 0) {
      return null;
    }
    if (percentualDesconto < 0 || percentualDesconto > 100) {
      return null;
    }
    if (numConcorrentes < 1 || numConcorrentes > 50) {
      return null;
    }
    return calcularSimulacao(valorInicialNumber, percentualDesconto, numConcorrentes);
  }, [numConcorrentes, percentualDesconto, valorInicialNumber]);

  const payload = useMemo<SimularLanceInput | null>(() => {
    if (!resultado || !Number.isFinite(valorInicialNumber) || valorInicialNumber <= 0) {
      return null;
    }

    return {
      valorInicial: round2(valorInicialNumber),
      percentualDesconto,
      numConcorrentes,
      bidId,
    };
  }, [bidId, numConcorrentes, percentualDesconto, resultado, valorInicialNumber]);

  const carregarHistorico = useCallback(async () => {
    if (!showHistorico || !bidId) {
      return;
    }
    setIsLoadingHistorico(true);
    try {
      const data = await getHistoricoSimulacoes(bidId);
      setHistorico(data);
    } catch {
      toast({
        title: "Erro ao carregar histórico",
        description: "Não foi possível carregar as simulações salvas.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingHistorico(false);
    }
  }, [bidId, showHistorico, toast]);

  const salvar = async () => {
    if (!payload) {
      return;
    }
    setIsSaving(true);
    try {
      await simularLance(payload);
      if (showHistorico) {
        await carregarHistorico();
      }
      toast({
        title: "Simulação salva",
        description: "A simulação foi registrada com sucesso.",
      });
    } catch {
      toast({
        title: "Erro ao salvar simulação",
        description: "Não foi possível registrar a simulação agora.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    void carregarHistorico();
  }, [carregarHistorico]);

  useEffect(() => {
    if (!autoSave || !payload || !bidId) {
      return;
    }

    const payloadKey = JSON.stringify(payload);
    if (payloadKey === lastSavedPayloadRef.current) {
      return;
    }

    const timeout = setTimeout(async () => {
      setIsSaving(true);
      try {
        await simularLance(payload);
        lastSavedPayloadRef.current = payloadKey;
        await carregarHistorico();
      } catch {
        toast({
          title: "Erro no salvamento automático",
          description: "Não foi possível salvar a simulação automaticamente.",
          variant: "destructive",
        });
      } finally {
        setIsSaving(false);
      }
    }, 800);

    return () => clearTimeout(timeout);
  }, [autoSave, bidId, carregarHistorico, payload, toast]);

  return (
    <div className="space-y-6">
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
        <CardContent className="pt-5">
          <p className="text-sm text-amber-900 dark:text-amber-300">
            Simulador apenas — o envio do lance deve ser feito manualmente no ComprasNet.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Parâmetros da simulação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="valorInicial">Valor inicial (R$)</Label>
            <Input
              id="valorInicial"
              type="text"
              inputMode="decimal"
              placeholder="Ex: 100000"
              value={valorInicial}
              onChange={(event) => setValorInicial(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="percentualDesconto">Desconto mínimo aceitável (%)</Label>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_120px] gap-3 items-center">
              <Input
                id="percentualDescontoRange"
                type="range"
                min={0}
                max={50}
                value={percentualDesconto}
                onChange={(event) => setPercentualDesconto(Number(event.target.value))}
                className="h-2 p-0 border-0 shadow-none"
              />
              <Input
                id="percentualDesconto"
                type="number"
                min={0}
                max={50}
                step={0.1}
                value={percentualDesconto}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (!Number.isFinite(value)) return;
                  setPercentualDesconto(Math.max(0, Math.min(50, value)));
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="numConcorrentes">Nº de concorrentes estimado</Label>
            <Input
              id="numConcorrentes"
              type="number"
              min={1}
              max={50}
              value={numConcorrentes}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (!Number.isFinite(value)) return;
                setNumConcorrentes(Math.max(1, Math.min(50, value)));
              }}
            />
          </div>
        </CardContent>
      </Card>

      {resultado && (
        <>
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-900 p-4">
                  <p className="text-xs uppercase font-semibold text-blue-700 dark:text-blue-300">
                    Lance sugerido
                  </p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-200 mt-2">
                    {formatBRL(resultado.lanceSugerido)}
                  </p>
                  <p className="text-xs text-blue-700/80 dark:text-blue-300/80 mt-1">
                    Melhor equilíbrio para competitividade.
                  </p>
                </div>

                <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                  <p className="text-xs uppercase font-semibold text-gray-600 dark:text-gray-300">
                    Lance mínimo
                  </p>
                  <p className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-2">
                    {formatBRL(resultado.lanceMinimo)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Limite mais seguro.</p>
                </div>

                <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                  <p className="text-xs uppercase font-semibold text-gray-600 dark:text-gray-300">
                    Lance agressivo
                  </p>
                  <p className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-2">
                    {formatBRL(resultado.lanceAgressivo)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Cenário para maximizar chance de vitória.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <p className="text-sm text-gray-700 dark:text-gray-200">
                Economia estimada:{" "}
                <strong>{formatBRL(resultado.economia)}</strong> (
                <strong>{resultado.percentualEconomia.toFixed(2)}%</strong> abaixo)
              </p>
            </CardContent>
          </Card>

          {showSaveButton && !autoSave && (
            <div>
              <Button onClick={salvar} disabled={isSaving}>
                {isSaving ? "Salvando..." : "Salvar simulação"}
              </Button>
            </div>
          )}

          {autoSave && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Salvamento automático {isSaving ? "em andamento..." : "ativo"}.
            </p>
          )}
        </>
      )}

      {showHistorico && (
        <Card>
          <CardHeader>
            <CardTitle>Histórico de simulações</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingHistorico ? (
              <p className="text-sm text-gray-500">Carregando histórico...</p>
            ) : historico.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhuma simulação registrada para esta licitação.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Valor Inicial</TableHead>
                    <TableHead>Lance Sugerido</TableHead>
                    <TableHead>Concorrentes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historico.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {format(new Date(item.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>{formatBRL(item.valorInicial)}</TableCell>
                      <TableCell>{formatBRL(item.lanceSugerido)}</TableCell>
                      <TableCell>{item.numConcorrentes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
