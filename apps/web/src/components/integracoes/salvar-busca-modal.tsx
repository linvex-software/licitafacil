"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { BookmarkPlus, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface SalvarBuscaModalProps {
  filtros: {
    cnpj?: string;
    uf?: string;
    modalidade?: string;
    dataInicio?: string;
    dataFim?: string;
    keywords?: string;
  };
  onClose: () => void;
}

export function SalvarBuscaModal({ filtros, onClose }: SalvarBuscaModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [nome, setNome] = useState("");
  const [autoImportar, setAutoImportar] = useState(false);

  async function handleSalvar() {
    if (!nome.trim()) return;
    setLoading(true);

    try {
      await api.post("/integracoes/comprasnet/buscas-salvas", {
        nome,
        filtros,
        autoImportar,
      });

      toast({ title: "Busca salva com sucesso!" });
      onClose();
    } catch {
      toast({ title: "Erro ao salvar busca", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookmarkPlus className="w-5 h-5" />
            Salvar Busca
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Nome da busca *</Label>
            <Input
              placeholder="Ex: Prefeitura SP - Equipamentos"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Importação automática</Label>
              <p className="text-xs text-gray-500">
                Executa todo dia às 7h e importa automaticamente
              </p>
            </div>
            <Switch checked={autoImportar} onCheckedChange={setAutoImportar} />
          </div>

          <div className="bg-gray-50 p-3 rounded text-xs text-gray-600 space-y-0.5">
            <p>
              <strong>Filtros salvos:</strong>
            </p>
            {filtros.cnpj && <p>CNPJ: {filtros.cnpj}</p>}
            {filtros.uf && <p>UF: {filtros.uf}</p>}
            {filtros.modalidade && filtros.modalidade !== "0" && (
              <p>Modalidade: código {filtros.modalidade}</p>
            )}
            {filtros.keywords && <p>Keywords: {filtros.keywords}</p>}
            {!filtros.cnpj && !filtros.uf && <p>Busca geral (sem filtro de órgão/UF)</p>}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={handleSalvar}
              disabled={loading || !nome}
              className="flex-1"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
