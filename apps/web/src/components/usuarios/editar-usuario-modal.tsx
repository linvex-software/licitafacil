"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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

interface Usuario {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface EditarUsuarioModalProps {
  usuario: Usuario;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditarUsuarioModal({
  usuario,
  onClose,
  onSuccess,
}: EditarUsuarioModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: usuario.name,
    role: usuario.role,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      await api.patch(`/users/${usuario.id}`, formData);

      toast({
        title: "Usuário atualizado",
        description: "Os dados foram salvos com sucesso.",
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description:
          error.response?.data?.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Email (não editável)</Label>
            <Input value={usuario.email} disabled className="bg-muted" />
          </div>

          <div className="space-y-2">
            <Label>Nome Completo</Label>
            <Input
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Perfil</Label>
            <Select
              value={formData.role}
              onValueChange={(v) =>
                setFormData({ ...formData, role: v })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="COLABORADOR">Colaborador</SelectItem>
                <SelectItem value="ADMIN">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
