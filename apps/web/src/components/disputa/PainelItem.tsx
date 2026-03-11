"use client";

import { useMemo, useState } from "react";
import { Pause, Play, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DisputaStatus, DisputaConfiguracao } from "@/lib/api";
import type { PosicaoItem } from "@/hooks/useDisputaSocket";

interface PainelItemProps {
  item: DisputaConfiguracao;
  posicao?: PosicaoItem;
  statusGlobal: DisputaStatus | null;
  onPausar: () => void;
  onRetomar: () => void;
  onLanceManual: (itemId: string, valor: number) => void;
  onDesistir: (itemId: string) => void;
}

function formatarMoeda(valor?: number) {
  if (typeof valor !== "number" || !Number.isFinite(valor)) return "-";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function isPausada(status: DisputaStatus | null) {
  return status === "PAUSADA" || status === ("PAUSADO" as DisputaStatus);
}

function isAtiva(status: DisputaStatus | null) {
  return status === "AO_VIVO" || status === ("ATIVO" as DisputaStatus);
}

export function PainelItem({
  item,
  posicao,
  statusGlobal,
  onPausar,
  onRetomar,
  onLanceManual,
  onDesistir,
}: PainelItemProps) {
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualValue, setManualValue] = useState("");

  const itemId = String(item.itemNumero);
  const posAtual = posicao?.posicao ?? 99;
  const lider = posAtual === 1;
  const pausada = isPausada(statusGlobal);
  const ativa = isAtiva(statusGlobal);

  const badgeClass = lider
    ? "bg-green-500/20 text-green-400 border border-green-500/30"
    : "bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse";

  const ringClass = lider ? "" : "ring-1 ring-amber-500/40";

  const foraLiderancaLabel = useMemo(() => {
    if (!posicao?.foraLiderancaEm) return null;
    const segundos = Math.floor((Date.now() - posicao.foraLiderancaEm.getTime()) / 1000);
    if (segundos < 60) return `${segundos}s fora da lideranca`;
    return `${Math.floor(segundos / 60)}m fora da lideranca`;
  }, [posicao?.foraLiderancaEm]);

  const confirmarLance = () => {
    const valor = Number(manualValue);
    if (!Number.isFinite(valor) || valor <= 0) return;
    onLanceManual(itemId, valor);
    setManualValue("");
    setShowManualInput(false);
  };

  return (
    <div className={`bg-card border border-border rounded-lg p-4 space-y-4 ${ringClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm md:text-base font-semibold text-foreground">
            Item {String(item.itemNumero).padStart(3, "0")} — {item.itemDescricao || "Sem descricao"}
          </h3>
          {foraLiderancaLabel && <p className="text-xs text-amber-400 mt-1">{foraLiderancaLabel}</p>}
        </div>
        <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${badgeClass}`}>
          {posAtual}º LUGAR
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Melhor lance</p>
          <p className="text-sm font-semibold text-foreground">{formatarMoeda(posicao?.melhorLance)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Meu ultimo lance</p>
          <p className="text-sm font-semibold text-foreground">{formatarMoeda(posicao?.meuUltimoLance)}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {ativa && (
          <Button size="sm" variant="outline" onClick={onPausar}>
            <Pause className="h-4 w-4 mr-1.5" />
            Pausar
          </Button>
        )}
        {pausada && (
          <Button size="sm" variant="outline" onClick={onRetomar}>
            <Play className="h-4 w-4 mr-1.5" />
            Retomar
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => setShowManualInput((prev) => !prev)}>
          <Send className="h-4 w-4 mr-1.5" />
          Lance Manual
        </Button>
        <Button size="sm" variant="destructive" onClick={() => onDesistir(itemId)}>
          Desistir
        </Button>
      </div>

      {showManualInput && (
        <div className="flex gap-2">
          <Input
            type="number"
            min={0}
            step="0.01"
            value={manualValue}
            onChange={(event) => setManualValue(event.target.value)}
            placeholder="Digite o valor do lance"
          />
          <Button size="sm" onClick={confirmarLance}>
            Confirmar
          </Button>
        </div>
      )}
    </div>
  );
}
