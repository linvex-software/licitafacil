"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { GerarPeticaoBody, TipoPeticao } from "@/lib/api";

interface GerarPeticaoModalProps {
  open: boolean;
  tipo: TipoPeticao | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (body: Omit<GerarPeticaoBody, "tipo" | "bidId">) => Promise<void>;
}

const TIPO_LABEL: Record<TipoPeticao, string> = {
  IMPUGNACAO: "Impugnação",
  ESCLARECIMENTO: "Esclarecimento",
  RECURSO: "Recurso",
  INTENCAO_RECURSO: "Intenção de Recurso",
  CONTRA_RAZAO: "Contrarrazão",
};

export function GerarPeticaoModal({
  open,
  tipo,
  submitting,
  onClose,
  onSubmit,
}: GerarPeticaoModalProps) {
  const [conteudo, setConteudo] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [endereco, setEndereco] = useState("");
  const [cidade, setCidade] = useState("");
  const [error, setError] = useState<string | null>(null);

  const title = useMemo(() => {
    if (!tipo) return "Gerar petição";
    return `Gerar ${TIPO_LABEL[tipo]}`;
  }, [tipo]);

  const reset = () => {
    setConteudo("");
    setCnpj("");
    setEndereco("");
    setCidade("");
    setError(null);
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!conteudo.trim()) {
      setError("A fundamentação é obrigatória.");
      return;
    }

    setError(null);
    try {
      await onSubmit({
        conteudo: conteudo.trim(),
        cnpj: cnpj.trim() || undefined,
        endereco: endereco.trim() || undefined,
        cidade: cidade.trim() || undefined,
      });
      reset();
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || "Erro ao gerar petição";
      setError(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] md:w-[80vw] lg:w-[60vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">{title}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="conteudo-peticao">Fundamentação / Conteúdo Principal</Label>
            <Textarea
              id="conteudo-peticao"
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              rows={8}
              placeholder="Descreva os fundamentos legais e fáticos da petição..."
              className="min-h-[170px]"
              disabled={submitting}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="cnpj-peticao">CNPJ (opcional)</Label>
              <Input
                id="cnpj-peticao"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                placeholder="00.000.000/0001-00"
                disabled={submitting}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cidade-peticao">Cidade/UF (opcional)</Label>
              <Input
                id="cidade-peticao"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                placeholder="Brasília/DF"
                disabled={submitting}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="endereco-peticao">Endereço completo (opcional)</Label>
            <Input
              id="endereco-peticao"
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              placeholder="Rua Exemplo, 123 - Bairro - Cidade/UF"
              disabled={submitting}
            />
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
            {submitting ? "Gerando..." : "Gerar .docx"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
