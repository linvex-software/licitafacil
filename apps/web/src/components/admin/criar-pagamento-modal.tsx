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
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

interface CriarPagamentoModalProps {
  contratoId: string;
  onSuccess: () => void;
}

export function CriarPagamentoModal({
  contratoId,
  onSuccess,
}: CriarPagamentoModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    tipo: "MENSALIDADE",
    valor: "",
    dataPrevista: "",
    dataPago: "",
    metodoPagamento: "PIX",
    observacoes: "",
  });

  function resetForm() {
    setFormData({
      tipo: "MENSALIDADE",
      valor: "",
      dataPrevista: "",
      dataPago: "",
      metodoPagamento: "PIX",
      observacoes: "",
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post("/admin/pagamentos", {
        contratoId,
        tipo: formData.tipo,
        valor: parseFloat(formData.valor),
        dataPrevista: formData.dataPrevista,
        dataPago: formData.dataPago || undefined,
        metodoPagamento: formData.metodoPagamento,
        observacoes: formData.observacoes || undefined,
      });

      toast({
        title: "Pagamento registrado",
        description: "O pagamento foi registrado com sucesso.",
      });

      setOpen(false);
      resetForm();
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Erro ao registrar pagamento",
        description: error.response?.data?.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Registrar Pagamento
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Novo Pagamento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select
              value={formData.tipo}
              onValueChange={(v) => setFormData({ ...formData, tipo: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SETUP">Setup</SelectItem>
                <SelectItem value="MENSALIDADE">Mensalidade</SelectItem>
                <SelectItem value="EXTRA">Extra</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Valor (R$)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0,00"
              value={formData.valor}
              onChange={(e) =>
                setFormData({ ...formData, valor: e.target.value })
              }
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data Prevista</Label>
              <Input
                type="date"
                value={formData.dataPrevista}
                onChange={(e) =>
                  setFormData({ ...formData, dataPrevista: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Data Pago (opcional)</Label>
              <Input
                type="date"
                value={formData.dataPago}
                onChange={(e) =>
                  setFormData({ ...formData, dataPago: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Método de Pagamento</Label>
            <Select
              value={formData.metodoPagamento}
              onValueChange={(v) =>
                setFormData({ ...formData, metodoPagamento: v })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PIX">PIX</SelectItem>
                <SelectItem value="Boleto">Boleto</SelectItem>
                <SelectItem value="TED">TED</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Observações (opcional)</Label>
            <Input
              placeholder="Ex: Referente ao mês de fevereiro..."
              value={formData.observacoes}
              onChange={(e) =>
                setFormData({ ...formData, observacoes: e.target.value })
              }
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar Pagamento"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
