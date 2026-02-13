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
import { UserPlus } from "lucide-react";

interface CriarUsuarioModalProps {
  onSuccess: () => void;
  limiteAtingido?: boolean;
}

export function CriarUsuarioModal({
  onSuccess,
}: CriarUsuarioModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "COLABORADOR",
  });

  function resetForm() {
    setFormData({
      name: "",
      email: "",
      password: "",
      role: "COLABORADOR",
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post("/users", formData);

      toast({
        title: "Usuário criado",
        description: `${formData.name} foi adicionado com sucesso.`,
      });

      setOpen(false);
      resetForm();
      onSuccess();
    } catch (error: any) {
      const message =
        error.response?.data?.message || "Erro ao criar usuário";
      toast({
        title: "Erro",
        description: Array.isArray(message) ? message[0] : message,
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
          <UserPlus className="mr-2 h-4 w-4" />
          Novo Usuário
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Criar Novo Usuário</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome Completo *</Label>
            <Input
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="João da Silva"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Email *</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              placeholder="joao@empresa.com.br"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Senha *</Label>
            <Input
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              placeholder="Mínimo 6 caracteres"
              minLength={6}
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
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Criando..." : "Criar Usuário"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
