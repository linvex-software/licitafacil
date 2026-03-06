"use client";

import { useEffect, useMemo, useState } from "react";
import type { Bid } from "@licitafacil/shared";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateBid } from "@/hooks/use-licitacoes";
import { useToast } from "@/hooks/use-toast";

type ModalidadeUi =
  | "PREGAO_ELETRONICO"
  | "PREGAO_PRESENCIAL"
  | "CONCORRENCIA"
  | "TOMADA_DE_PRECOS"
  | "CONVITE"
  | "DISPENSA"
  | "INEXIGIBILIDADE"
  | "OUTRA";

interface EditarLicitacaoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bid: Bid | null;
  onSuccess?: () => void;
}

interface FormState {
  title: string;
  modality: ModalidadeUi;
  objeto: string;
  agency: string;
  uf: string;
  municipio: string;
  numeroEdital: string;
  dataAbertura: string;
  valorEstimado: string;
}

const UF_LIST = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO",
  "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR",
  "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
] as const;

const MODALIDADES: Array<{ value: ModalidadeUi; label: string }> = [
  { value: "PREGAO_ELETRONICO", label: "Pregão Eletrônico" },
  { value: "PREGAO_PRESENCIAL", label: "Pregão Presencial" },
  { value: "CONCORRENCIA", label: "Concorrência" },
  { value: "TOMADA_DE_PRECOS", label: "Tomada de Preços" },
  { value: "CONVITE", label: "Convite" },
  { value: "DISPENSA", label: "Dispensa" },
  { value: "INEXIGIBILIDADE", label: "Inexigibilidade" },
  { value: "OUTRA", label: "Outra" },
];

function toInputDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

function mapApiToUi(modality?: string | null): ModalidadeUi {
  const normalized = (modality || "").toUpperCase();
  if (normalized === "PREGAO_ELETRONICO") return "PREGAO_ELETRONICO";
  if (normalized === "CONCORRENCIA") return "CONCORRENCIA";
  if (normalized === "DISPENSA") return "DISPENSA";
  if (normalized === "OUTRA") return "OUTRA";
  return "OUTRA";
}

function mapUiToApi(modality: ModalidadeUi): "PREGAO_ELETRONICO" | "CONCORRENCIA" | "DISPENSA" | "OUTRA" {
  if (modality === "PREGAO_ELETRONICO" || modality === "PREGAO_PRESENCIAL") return "PREGAO_ELETRONICO";
  if (modality === "CONCORRENCIA" || modality === "TOMADA_DE_PRECOS") return "CONCORRENCIA";
  if (modality === "DISPENSA" || modality === "CONVITE" || modality === "INEXIGIBILIDADE") return "DISPENSA";
  return "OUTRA";
}

export function EditarLicitacaoModal({ open, onOpenChange, bid, onSuccess }: EditarLicitacaoModalProps) {
  const { toast } = useToast();
  const { mutateAsync: updateBid, isPending } = useUpdateBid();
  const [form, setForm] = useState<FormState>({
    title: "",
    modality: "PREGAO_ELETRONICO",
    objeto: "",
    agency: "",
    uf: "",
    municipio: "",
    numeroEdital: "",
    dataAbertura: "",
    valorEstimado: "",
  });
  const [initialForm, setInitialForm] = useState<FormState | null>(null);

  useEffect(() => {
    if (!open || !bid) return;

    const nextState: FormState = {
      title: bid.title || "",
      modality: mapApiToUi(bid.modality),
      objeto: bid.title || "",
      agency: bid.agency || "",
      uf: (bid.uf || "").toUpperCase(),
      municipio: bid.municipio || "",
      numeroEdital: "",
      dataAbertura: toInputDateTime(bid.createdAt),
      valorEstimado: "",
    };

    setForm(nextState);
    setInitialForm(nextState);
  }, [open, bid]);

  const hasChanges = useMemo(() => {
    if (!initialForm) return false;
    return JSON.stringify(form) !== JSON.stringify(initialForm);
  }, [form, initialForm]);

  async function handleSave() {
    if (!bid) return;

    const title = form.title.trim();
    const agency = form.agency.trim();
    const uf = form.uf.trim().toUpperCase();
    if (!title || !agency || !uf) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha ao menos título, órgão e UF.",
        variant: "destructive",
      });
      return;
    }

    if (!hasChanges) {
      toast({
        title: "Sem alterações",
        description: "Nenhum campo foi alterado.",
      });
      return;
    }

    try {
      const payload: Record<string, unknown> = {};

      if (!initialForm || title !== initialForm.title) payload.title = title;
      if (!initialForm || agency !== initialForm.agency) payload.agency = agency;
      if (!initialForm || uf !== initialForm.uf) payload.uf = uf;
      if (!initialForm || form.municipio !== initialForm.municipio) payload.municipio = form.municipio.trim();
      if (!initialForm || form.modality !== initialForm.modality) payload.modality = mapUiToApi(form.modality);
      if (!initialForm || form.objeto !== initialForm.objeto) payload.objeto = form.objeto.trim();
      if (!initialForm || form.numeroEdital !== initialForm.numeroEdital) payload.numeroEdital = form.numeroEdital.trim();

      if (!initialForm || form.dataAbertura !== initialForm.dataAbertura) {
        if (form.dataAbertura) {
          const dateObj = new Date(form.dataAbertura);
          if (Number.isNaN(dateObj.getTime())) {
            toast({
              title: "Data inválida",
              description: "Verifique a data de abertura informada.",
              variant: "destructive",
            });
            return;
          }
          payload.dataAbertura = dateObj.toISOString();
        } else {
          payload.dataAbertura = null;
        }
      }

      if (!initialForm || form.valorEstimado !== initialForm.valorEstimado) {
        const parsed = form.valorEstimado ? Number(form.valorEstimado.replace(",", ".")) : null;
        if (parsed !== null && Number.isNaN(parsed)) {
          toast({
            title: "Valor inválido",
            description: "Informe um valor estimado numérico válido.",
            variant: "destructive",
          });
          return;
        }
        payload.valorEstimado = parsed;
      }

      await updateBid({ id: bid.id, data: payload as Partial<Bid> });

      toast({
        title: "Licitação atualizada",
        description: "Os dados da licitação foram salvos com sucesso.",
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error?.response?.data?.message || "Não foi possível atualizar a licitação.",
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4" />
            Editar licitação
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="edit-title">Título</Label>
            <Input
              id="edit-title"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Título da licitação"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-modality">Modalidade</Label>
            <Select value={form.modality} onValueChange={(value) => setForm((prev) => ({ ...prev, modality: value as ModalidadeUi }))}>
              <SelectTrigger id="edit-modality">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODALIDADES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-agency">Órgão</Label>
            <Input
              id="edit-agency"
              value={form.agency}
              onChange={(e) => setForm((prev) => ({ ...prev, agency: e.target.value }))}
              placeholder="Órgão licitante"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-uf">UF *</Label>
            <Select value={form.uf || undefined} onValueChange={(value) => setForm((prev) => ({ ...prev, uf: value }))}>
              <SelectTrigger id="edit-uf">
                <SelectValue placeholder="Selecione a UF" />
              </SelectTrigger>
              <SelectContent>
                {UF_LIST.map((ufOption) => (
                  <SelectItem key={ufOption} value={ufOption}>
                    {ufOption}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-municipio">Município</Label>
            <Input
              id="edit-municipio"
              value={form.municipio}
              onChange={(e) => setForm((prev) => ({ ...prev, municipio: e.target.value }))}
              placeholder="Ex: Belo Horizonte"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="edit-objeto">Objeto</Label>
            <Textarea
              id="edit-objeto"
              value={form.objeto}
              onChange={(e) => setForm((prev) => ({ ...prev, objeto: e.target.value }))}
              placeholder="Descrição do objeto"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-numero">Número do edital</Label>
            <Input
              id="edit-numero"
              value={form.numeroEdital}
              onChange={(e) => setForm((prev) => ({ ...prev, numeroEdital: e.target.value }))}
              placeholder="Ex: PE 012/2026"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-data">Data de abertura</Label>
            <Input
              id="edit-data"
              type="datetime-local"
              value={form.dataAbertura}
              onChange={(e) => setForm((prev) => ({ ...prev, dataAbertura: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-valor">Valor estimado (R$)</Label>
            <Input
              id="edit-valor"
              type="number"
              min="0"
              step="0.01"
              value={form.valorEstimado}
              onChange={(e) => setForm((prev) => ({ ...prev, valorEstimado: e.target.value }))}
              placeholder="0,00"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={isPending}>
            {isPending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
