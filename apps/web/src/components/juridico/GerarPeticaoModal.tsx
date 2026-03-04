"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle } from "lucide-react";
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
  onSubmit: (
    body: Omit<GerarPeticaoBody, "tipo" | "bidId">,
  ) => Promise<void>;
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
  const [nomeEmpresa, setNomeEmpresa] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [endereco, setEndereco] = useState("");
  const [cidade, setCidade] = useState("");
  const [motivoIntencao, setMotivoIntencao] = useState("");
  const [escopoImpugnacao, setEscopoImpugnacao] = useState<"TOTAL" | "PARCIAL">("TOTAL");
  const [itensContestados, setItensContestados] = useState("");
  const [error, setError] = useState<string | null>(null);

  const title = useMemo(() => {
    if (!tipo) return "Gerar petição";
    return `Gerar ${TIPO_LABEL[tipo]}`;
  }, [tipo]);

  const reset = () => {
    setConteudo("");
    setNomeEmpresa("");
    setCnpj("");
    setEndereco("");
    setCidade("");
    setMotivoIntencao("");
    setEscopoImpugnacao("TOTAL");
    setItensContestados("");
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
    if (tipo === "INTENCAO_RECURSO" && !motivoIntencao.trim()) {
      setError("A intenção de recurso requer motivação explícita.");
      return;
    }

    setError(null);
    try {
      await onSubmit({
        conteudo: conteudo.trim(),
        nomeEmpresa: nomeEmpresa.trim() || undefined,
        cnpj: cnpj.trim() || undefined,
        endereco: endereco.trim() || undefined,
        cidade: cidade.trim() || undefined,
        motivoIntencao: motivoIntencao.trim() || undefined,
        escopoImpugnacao: tipo === "IMPUGNACAO" ? escopoImpugnacao : undefined,
        itensContestados:
          tipo === "IMPUGNACAO" && escopoImpugnacao === "PARCIAL"
            ? itensContestados
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean)
            : undefined,
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

          {tipo === "INTENCAO_RECURSO" && (
            <div className="mt-2 rounded-xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-800/40 dark:bg-orange-900/10">
              <div className="mb-3 flex gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                <div>
                  <p className="text-xs font-semibold text-orange-700 dark:text-orange-400">
                    Motivação obrigatória
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-orange-600 dark:text-orange-500">
                    O pregoeiro pode rejeitar intenções com fundamentação genérica.
                    Seja específico: cite a empresa, o item contestado e o fundamento legal.
                  </p>
                </div>
              </div>
              <textarea
                value={motivoIntencao}
                onChange={(e) => setMotivoIntencao(e.target.value)}
                placeholder="Ex: Recorro contra a habilitação da empresa X por entender que o atestado apresentado não comprova capacidade técnica para o item Y, conforme §3º do art. 67 da Lei 14.133/2021."
                rows={4}
                className="w-full resize-none rounded-lg border border-orange-200 bg-white p-3 text-sm text-gray-700 placeholder-gray-400 transition-colors focus:border-orange-400 focus:outline-none dark:border-orange-800/40 dark:bg-gray-900 dark:text-gray-300 dark:placeholder-gray-500"
              />
              <p className="mt-1.5 text-right text-[11px] text-orange-500">
                {motivoIntencao.length} caracteres · mínimo recomendado: 100
              </p>
            </div>
          )}

          {tipo === "IMPUGNACAO" && (
            <div className="mt-1">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Escopo da impugnação
              </label>
              <div className="flex gap-2">
                {(["TOTAL", "PARCIAL"] as const).map((escopo) => (
                  <button
                    key={escopo}
                    type="button"
                    onClick={() => setEscopoImpugnacao(escopo)}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      escopoImpugnacao === escopo
                        ? "border-[#0078D1] bg-[#0078D1]/10 text-[#0078D1]"
                        : "border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400"
                    }`}
                  >
                    {escopo === "TOTAL"
                      ? "Total — contesta o edital inteiro"
                      : "Parcial — contesta item específico"}
                  </button>
                ))}
              </div>

              {escopoImpugnacao === "PARCIAL" && (
                <Input
                  type="text"
                  placeholder="Descreva o(s) item(ns) contestado(s), separados por vírgula..."
                  value={itensContestados}
                  onChange={(e) => setItensContestados(e.target.value)}
                  className="mt-2"
                  disabled={submitting}
                />
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="nome-empresa-peticao">Nome da empresa (opcional)</Label>
              <Input
                id="nome-empresa-peticao"
                value={nomeEmpresa}
                onChange={(e) => setNomeEmpresa(e.target.value)}
                placeholder="Nome completo da empresa recorrente"
                disabled={submitting}
              />
            </div>
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
