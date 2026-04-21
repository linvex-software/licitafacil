"use client";

import { useMemo, useState } from "react";
import { Send } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ItemAoVivo } from "@/hooks/useDisputaSocket";

interface PainelItemProps {
  item: ItemAoVivo;
  onLance: (itemNumero: number, valor: number) => void;
}

function formatarMoeda(valor?: number) {
  if (typeof valor !== "number" || !Number.isFinite(valor)) return "-";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function badgePosicao(pos: number | null | undefined) {
  if (pos === 1) return { label: "1º", variant: "success" as const };
  if (pos === 2) return { label: "2º", variant: "warning" as const };
  if ((pos ?? 999) >= 3) return { label: `${pos ?? "-"}º`, variant: "destructive" as const };
  return { label: "-", variant: "secondary" as const };
}

export function PainelItem({ item, onLance }: PainelItemProps) {
  const [valor, setValor] = useState("");
  const posicao = item.posicaoAtual ?? null;
  const badge = badgePosicao(posicao);
  const foraPrimeiro = (posicao ?? 999) > 1;
  const ringClass = foraPrimeiro ? "animate-pulse ring-1 ring-foreground/30" : "";
  const encerrado = item.statusItem === "ENCERRADO";

  const foraLiderancaLabel = useMemo(() => {
    if (!item.perdeuLiderancaEm) return null;
    const segundos = Math.floor((Date.now() - item.perdeuLiderancaEm) / 1000);
    if (segundos < 60) return `${segundos}s fora da lideranca`;
    return `${Math.floor(segundos / 60)}m fora da lideranca`;
  }, [item.perdeuLiderancaEm]);

  const confirmar = () => {
    const n = Number(valor);
    if (!Number.isFinite(n) || n <= 0) return;
    onLance(item.itemNumero, n);
    setValor("");
  };

  return (
    <div className={`bg-card border border-border rounded-lg p-4 space-y-4 ${ringClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm md:text-base font-semibold text-foreground">
            Item {String(item.itemNumero).padStart(3, "0")} — {item.descricao || "Sem descricao"}
          </h3>
          {foraLiderancaLabel && <p className="mt-1 text-xs text-muted-foreground">{foraLiderancaLabel}</p>}
        </div>
        <Badge variant={badge.variant}>{badge.label} lugar</Badge>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Melhor lance mercado</p>
          <p className="text-sm font-semibold text-foreground">{formatarMoeda(item.melhorLance ?? undefined)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Ultimo lance registrado</p>
          <p className="text-sm font-semibold text-foreground">
            {formatarMoeda(item.ultimoLanceOperador ?? undefined)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Status item</p>
          <p className="text-sm font-semibold text-foreground">{item.statusItem}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={0}
          step="0.01"
          value={valor}
          onChange={(event) => setValor(event.target.value)}
          placeholder="Digite o valor do lance"
          disabled={encerrado || Boolean(item.lancePendente)}
        />
        <Button size="sm" onClick={confirmar} disabled={encerrado || Boolean(item.lancePendente)}>
          <Send className="h-4 w-4 mr-1.5" />
          Dar lance
        </Button>
      </div>

      {item.lancePendente && (
        <p className="text-xs text-muted-foreground">
          Preenchendo no portal: {formatarMoeda(item.lancePendente.valor)}
        </p>
      )}
      {item.lanceConfirmadoEm && Date.now() - item.lanceConfirmadoEm < 6000 && (
        <p className="text-xs text-muted-foreground">Lance confirmado no portal.</p>
      )}
    </div>
  );
}
