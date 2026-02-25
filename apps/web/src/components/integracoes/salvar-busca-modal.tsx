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
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filtrosAtuais: any;
  totalResultados: number;
  origemBusca?: "PNCP" | "COMPRASNET" | "DIARIOS_OFICIAIS";
}

export function SalvarBuscaModal({
  open,
  onOpenChange,
  filtrosAtuais,
  totalResultados,
  origemBusca = "COMPRASNET",
}: SalvarBuscaModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [nome, setNome] = useState("");
  const [autoImportar, setAutoImportar] = useState(false);

  async function handleSalvar() {
    if (!nome.trim()) return;
    setLoading(true);

    try {
      // Diferencia o endpoint caso a funcionalidade final de salvamento mude, 
      // ou envia uma origin tag no payload
      await api.post("/integracoes/comprasnet/buscas-salvas", {
        nome,
        filtros: filtrosAtuais,
        autoImportar,
        origem: origemBusca
      });

      toast({ title: "Busca salva com sucesso!" });
      onOpenChange(false);
    } catch {
      toast({ title: "Erro ao salvar busca", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            <p className="flex justify-between items-center mb-1">
              <strong>Filtros salvos:</strong>
              <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                {totalResultados} {totalResultados === 1 ? 'resultado atual' : 'resultados atuais'}
              </span>
            </p>
            {filtrosAtuais?.cnpj && <p>CNPJ: {filtrosAtuais.cnpj}</p>}
            {filtrosAtuais?.uf && <p>UF: {filtrosAtuais.uf}</p>}
            {filtrosAtuais?.municipio && <p>Município: {filtrosAtuais.municipio}</p>}
            {filtrosAtuais?.modalidade && filtrosAtuais.modalidade !== "0" && (
              <p>Modalidade: código {filtrosAtuais.modalidade}</p>
            )}
            {filtrosAtuais?.keywords && (
              <p>Keywords: {Array.isArray(filtrosAtuais.keywords) ? filtrosAtuais.keywords.join(', ') : filtrosAtuais.keywords}</p>
            )}
            {!filtrosAtuais?.cnpj && !filtrosAtuais?.uf && <p>Busca geral (sem filtro de UF/Órgão)</p>}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
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
