"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCreateBid } from "@/hooks/use-licitacoes";
import { useQueryClient } from "@tanstack/react-query";

interface CriarLicitacaoModalProps {
  onSuccess: () => void;
  limiteAtingido: boolean;
  limiteDisponivel?: number;
}

const MODALIDADES = [
  { value: "PREGAO_ELETRONICO", label: "Pregão Eletrônico" },
  { value: "CONCORRENCIA", label: "Concorrência" },
  { value: "DISPENSA", label: "Dispensa" },
  { value: "OUTRA", label: "Outra" },
] as const;

const STATUS_JURIDICO = [
  { value: "ANALISANDO", label: "Analisando" },
  { value: "PARTICIPANDO", label: "Participando" },
  { value: "DESCARTADA", label: "Descartada" },
  { value: "VENCIDA", label: "Vencida" },
  { value: "PERDIDA", label: "Perdida" },
  { value: "CANCELADA", label: "Cancelada" },
] as const;

const ESTADO_OPERACIONAL = [
  { value: "OK", label: "OK" },
  { value: "EM_RISCO", label: "Em Risco" },
] as const;

export function CriarLicitacaoModal({
  onSuccess,
  limiteAtingido,
  limiteDisponivel,
}: CriarLicitacaoModalProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    agency: "",
    modality: "PREGAO_ELETRONICO",
    legalStatus: "ANALISANDO",
    operationalState: "OK",
  });

  const { toast } = useToast();
  const createBid = useCreateBid();
  const queryClient = useQueryClient();

  function resetForm() {
    setFormData({
      title: "",
      agency: "",
      modality: "PREGAO_ELETRONICO",
      legalStatus: "ANALISANDO",
      operationalState: "OK",
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.title.trim() || !formData.agency.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o título e o órgão licitante.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createBid.mutateAsync(formData);

      toast({
        title: "Licitação criada",
        description: "A licitação foi adicionada com sucesso.",
      });

      setOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["bid-limite"] });
      onSuccess();
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        "Erro ao criar licitação. Tente novamente.";
      toast({
        title: "Erro ao criar licitação",
        description: message,
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          disabled={limiteAtingido}
          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200/50"
          title={
            limiteAtingido
              ? "Limite mensal de licitações atingido"
              : undefined
          }
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Licitação
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Criar Nova Licitação</DialogTitle>
        </DialogHeader>

        {limiteDisponivel !== undefined && limiteDisponivel <= 5 && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              Restam <strong>{limiteDisponivel}</strong> licitação(ões) no seu
              limite mensal.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Título / Objeto Resumido *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="Ex: Aquisição de equipamentos de informática"
              required
            />
          </div>

          <div>
            <Label htmlFor="agency">Órgão Licitante *</Label>
            <Input
              id="agency"
              value={formData.agency}
              onChange={(e) =>
                setFormData({ ...formData, agency: e.target.value })
              }
              placeholder="Ex: Prefeitura Municipal de São Paulo"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Modalidade *</Label>
              <Select
                value={formData.modality}
                onValueChange={(v) =>
                  setFormData({ ...formData, modality: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODALIDADES.map((mod) => (
                    <SelectItem key={mod.value} value={mod.value}>
                      {mod.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Status Jurídico</Label>
              <Select
                value={formData.legalStatus}
                onValueChange={(v) =>
                  setFormData({ ...formData, legalStatus: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_JURIDICO.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Estado Operacional</Label>
            <Select
              value={formData.operationalState}
              onValueChange={(v) =>
                setFormData({ ...formData, operationalState: v })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ESTADO_OPERACIONAL.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createBid.isPending}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {createBid.isPending ? "Criando..." : "Criar Licitação"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
