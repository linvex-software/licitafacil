"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { registrarResultadoDisputa, type Disputa } from "@/lib/api";

type ResultadoOperador = "GANHOU" | "PERDEU" | "DESISTIU";

interface RegistrarResultadoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disputaId: string;
  disputa?: Disputa | null;
  onSaved?: (disputa: Disputa) => void;
}

export function RegistrarResultadoModal({
  open,
  onOpenChange,
  disputaId,
  disputa,
  onSaved,
}: RegistrarResultadoModalProps) {
  const { toast } = useToast();
  const [resultado, setResultado] = useState<ResultadoOperador>("PERDEU");
  const [valorFinal, setValorFinal] = useState<string>("");
  const [observacao, setObservacao] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const placeholderValorFinal = useMemo(() => {
    if (resultado === "GANHOU") return "Ex: 12345.67";
    return "Opcional";
  }, [resultado]);

  useEffect(() => {
    if (!open) return;
    // Se já tiver algo vindo do backend, tenta pré-preencher
    const resultadoAtual = disputa?.resultado;
    if (resultadoAtual === "GANHOU" || resultadoAtual === "PERDEU" || resultadoAtual === "DESISTIU") {
      setResultado(resultadoAtual);
    }
    if (typeof disputa?.valorFinal === "number") {
      setValorFinal(String(disputa.valorFinal));
    }
    if (typeof disputa?.observacaoResultado === "string") {
      setObservacao(disputa.observacaoResultado);
    }
  }, [open, disputa]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const vf = valorFinal.trim();
      const payload = {
        resultado,
        valorFinal: vf ? Number(vf.replace(",", ".")) : undefined,
        observacao: observacao.trim() || undefined,
      };

      if (payload.valorFinal != null && (!Number.isFinite(payload.valorFinal) || payload.valorFinal < 0)) {
        toast({ title: "Valor final inválido", variant: "destructive" });
        return;
      }

      const updated = await registrarResultadoDisputa(disputaId, payload);
      toast({ title: "Resultado registrado", description: "O resultado da disputa foi salvo com sucesso." });
      onSaved?.(updated);
      onOpenChange(false);
    } catch {
      toast({ title: "Erro ao registrar resultado", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar resultado</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Resultado</Label>
            <Select value={resultado} onValueChange={(v) => setResultado(v as ResultadoOperador)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GANHOU">Ganhou</SelectItem>
                <SelectItem value="PERDEU">Perdeu</SelectItem>
                <SelectItem value="DESISTIU">Desistiu</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Valor final (opcional)</Label>
            <Input
              inputMode="decimal"
              value={valorFinal}
              placeholder={placeholderValorFinal}
              onChange={(e) => setValorFinal(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Observação (opcional)</Label>
            <Textarea
              value={observacao}
              placeholder="Ex: fomos desclassificados por documentação, item cancelado, etc."
              onChange={(e) => setObservacao(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

