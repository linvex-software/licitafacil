"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  buscarLicitacoes,
  criarDisputa,
  type CriarDisputaInput,
  type EstrategiaDisputa,
  type LicitacaoResumo,
  type PortalDisputa,
} from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

type ItemForm = {
  itemNumero: number;
  itemDescricao: string;
  valorMaximo: string;
  valorMinimo: string;
  estrategia: EstrategiaDisputa;
  ativo: boolean;
};

interface NovaDisputaModalProps {
  onSuccess: () => void;
}

function formatarCnpj(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function itemPadrao(): ItemForm {
  return {
    itemNumero: 1,
    itemDescricao: "",
    valorMaximo: "",
    valorMinimo: "",
    estrategia: "CONSERVADORA",
    ativo: true,
  };
}

export function NovaDisputaModal({ onSuccess }: NovaDisputaModalProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [bids, setBids] = useState<LicitacaoResumo[]>([]);
  const [loadingBids, setLoadingBids] = useState(false);
  const [erroLicitacao, setErroLicitacao] = useState<string | null>(null);
  const { toast } = useToast();

  const [form, setForm] = useState({
    bidId: "",
    portal: "COMPRASNET" as PortalDisputa,
    cnpj: "",
    senha: "",
    agendadoPara: "",
  });
  const [itens, setItens] = useState<ItemForm[]>([itemPadrao()]);

  useEffect(() => {
    buscarLicitacoes()
      .then((data) => console.log("licitacoes:", data))
      .catch((err) => console.error("erro licitacoes:", err));
  }, []);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoadingBids(true);
      try {
        const data = await buscarLicitacoes();
        setBids(data);
      } catch {
        setBids([]);
      } finally {
        setLoadingBids(false);
      }
    };
    void load();
  }, [open]);

  const bidSelecionada = useMemo(() => bids.find((bid) => bid.id === form.bidId), [bids, form.bidId]);

  const reset = () => {
    setStep(1);
    setForm({
      bidId: "",
      portal: "COMPRASNET",
      cnpj: "",
      senha: "",
      agendadoPara: "",
    });
    setItens([itemPadrao()]);
  };

  const validarItens = (): string | null => {
    if (itens.length === 0) return "Adicione ao menos um item.";
    for (const item of itens) {
      if (!item.itemNumero || item.itemNumero < 1) return "Número do item inválido.";
      const max = Number(item.valorMaximo);
      const min = Number(item.valorMinimo);
      if (!Number.isFinite(max) || max <= 0) return "Valor máximo deve ser maior que zero.";
      if (!Number.isFinite(min) || min <= 0) return "Piso (valor mínimo) é obrigatório.";
      if (min >= max) return "O piso deve ser menor que o teto no item configurado.";
    }
    return null;
  };

  const handleSalvar = async () => {
    if (!form.bidId) {
      toast({ title: "Selecione a licitação", variant: "destructive" });
      return;
    }
    if (form.cnpj.replace(/\D/g, "").length !== 14) {
      toast({ title: "CNPJ inválido", description: "Informe um CNPJ com 14 dígitos.", variant: "destructive" });
      return;
    }
    if (!form.senha.trim()) {
      toast({ title: "Senha obrigatória", variant: "destructive" });
      return;
    }
    const erroItens = validarItens();
    if (erroItens) {
      toast({ title: "Configuração inválida", description: erroItens, variant: "destructive" });
      return;
    }

    const agendadoParaLimpo = form.agendadoPara?.trim();
    const payload: CriarDisputaInput = {
      bidId: form.bidId,
      portal: form.portal,
      credencial: {
        cnpj: form.cnpj.replace(/\D/g, ""),
        senha: form.senha,
      },
      configuracoes: itens.map((item) => ({
        itemNumero: item.itemNumero,
        itemDescricao: item.itemDescricao || undefined,
        valorMaximo: Number(item.valorMaximo),
        valorMinimo: Number(item.valorMinimo),
        estrategia: item.estrategia,
        ativo: item.ativo,
      })),
      ...(agendadoParaLimpo
        ? { agendadoPara: new Date(agendadoParaLimpo).toISOString() }
        : {}),
    };

    setIsSaving(true);
    try {
      await criarDisputa(payload);
      onSuccess();
      toast({ title: "Disputa criada", description: "A disputa foi registrada com sucesso." });
      setOpen(false);
      reset();
    } catch (error: unknown) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : "Falha ao criar disputa.";
      toast({ title: "Erro ao criar disputa", description: message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => {
      setOpen(value);
      if (!value) reset();
    }}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary-600 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Nova Disputa
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Nova disputa automatizada</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 text-sm mb-2">
          <span className={step === 1 ? "font-semibold text-primary" : "text-gray-500"}>Passo 1</span>
          <span className="text-gray-400">/</span>
          <span className={step === 2 ? "font-semibold text-primary" : "text-gray-500"}>Passo 2</span>
        </div>

        {step === 1 ? (
          <div className="space-y-4">
            <div>
              <Label>Licitação</Label>
              <Select
                value={form.bidId || undefined}
                onValueChange={(value) => {
                  setForm((prev) => ({ ...prev, bidId: value }));
                  setErroLicitacao(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingBids ? "Carregando licitações..." : "Selecione uma licitação"} />
                </SelectTrigger>
                <SelectContent>
                  {bids.map((bid) => (
                    <SelectItem key={bid.id} value={bid.id}>
                      {bid.title} - {bid.agency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {erroLicitacao && (
                <p className="text-xs text-red-600 mt-1">{erroLicitacao}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Portal</Label>
                <Select value={form.portal} onValueChange={(value: PortalDisputa) => setForm((prev) => ({ ...prev, portal: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COMPRASNET">ComprasNet</SelectItem>
                    <SelectItem value="BNC">BNC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>CNPJ</Label>
                <Input
                  value={form.cnpj}
                  placeholder="00.000.000/0000-00"
                  onChange={(e) => setForm((prev) => ({ ...prev, cnpj: formatarCnpj(e.target.value) }))}
                />
              </div>
            </div>

            <div>
              <Label>Senha do portal</Label>
              <Input type="password" value={form.senha} onChange={(e) => setForm((prev) => ({ ...prev, senha: e.target.value }))} />
            </div>

            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
              Suas credenciais são armazenadas com criptografia AES-256 e nunca são exibidas após salvas.
            </p>

            <div>
              <Label>Agendar início (opcional)</Label>
              <Input
                type="datetime-local"
                value={form.agendadoPara}
                onChange={(e) => setForm((prev) => ({ ...prev, agendadoPara: e.target.value }))}
              />
            </div>

            {bidSelecionada && (
              <p className="text-xs text-gray-500">
                Licitação selecionada: <strong>{bidSelecionada.title}</strong> ({bidSelecionada.agency})
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button
                onClick={() => {
                  if (!form.bidId) {
                    setErroLicitacao("Selecione uma licitação");
                    return;
                  }
                  setStep(2);
                }}
                disabled={!form.bidId}
              >
                Continuar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {itens.map((item, idx) => (
              <div key={`item-${idx}`} className="border rounded-lg p-3 space-y-3">
                <div className="flex justify-between items-center">
                  <p className="font-medium">Item {idx + 1}</p>
                  {itens.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setItens((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Número do item</Label>
                    <Input
                      type="number"
                      min={1}
                      value={item.itemNumero}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        setItens((prev) => prev.map((it, i) => (i === idx ? { ...it, itemNumero: value } : it)));
                      }}
                    />
                  </div>
                  <div>
                    <Label>Descrição (opcional)</Label>
                    <Input
                      value={item.itemDescricao}
                      onChange={(e) => setItens((prev) => prev.map((it, i) => (i === idx ? { ...it, itemDescricao: e.target.value } : it)))}
                    />
                  </div>
                  <div>
                    <Label>Valor máximo (R$)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.valorMaximo}
                      onChange={(e) => setItens((prev) => prev.map((it, i) => (i === idx ? { ...it, valorMaximo: e.target.value } : it)))}
                    />
                  </div>
                  <div>
                    <Label>Valor mínimo/piso (R$)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.valorMinimo}
                      onChange={(e) => setItens((prev) => prev.map((it, i) => (i === idx ? { ...it, valorMinimo: e.target.value } : it)))}
                    />
                  </div>
                  <div>
                    <Label>Estratégia</Label>
                    <Select
                      value={item.estrategia}
                      onValueChange={(value: EstrategiaDisputa) =>
                        setItens((prev) => prev.map((it, i) => (i === idx ? { ...it, estrategia: value } : it)))
                      }
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AGRESSIVA">Agressiva</SelectItem>
                        <SelectItem value="CONSERVADORA">Conservadora</SelectItem>
                        <SelectItem value="POR_MARGEM">Por Margem</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between border rounded-md px-3 py-2 mt-6">
                    <Label>Participar deste item</Label>
                    <Switch
                      checked={item.ativo}
                      onCheckedChange={(checked) => setItens((prev) => prev.map((it, i) => (i === idx ? { ...it, ativo: checked } : it)))}
                    />
                  </div>
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const ultimoNumero = itens[itens.length - 1]?.itemNumero ?? 0;
                setItens((prev) => [...prev, { ...itemPadrao(), itemNumero: ultimoNumero + 1 }]);
              }}
            >
              Adicionar item
            </Button>

            <div className="flex justify-between gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={handleSalvar} disabled={isSaving}>
                  {isSaving ? "Criando..." : "Criar Disputa"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
