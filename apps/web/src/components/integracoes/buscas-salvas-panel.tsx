"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/Badge";
import { Bookmark, Play, Trash2, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface FiltrosBusca {
  cnpj?: string;
  uasg?: string;
  uf?: string;
  modalidade?: string;
  dataInicio?: string;
  dataFim?: string;
  keywords?: string;
}

interface BuscaSalva {
  id: string;
  nome: string;
  filtros: FiltrosBusca;
  autoImportar: boolean;
  ultimaExecucao: string | null;
  totalImportadas: number;
}

interface BuscasSalvasPanelProps {
  onExecutar: (filtros: FiltrosBusca) => void;
}

export function BuscasSalvasPanel({ onExecutar }: BuscasSalvasPanelProps) {
  const { toast } = useToast();
  const [buscas, setBuscas] = useState<BuscaSalva[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarBuscas();
  }, []);

  async function carregarBuscas() {
    try {
      const response = await api.get("/integracoes/comprasnet/buscas-salvas");
      setBuscas(response.data);
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
  }

  async function deletarBusca(id: string) {
    try {
      await api.delete(`/integracoes/comprasnet/buscas-salvas/${id}`);
      setBuscas(buscas.filter((b) => b.id !== id));
      toast({ title: "Busca removida" });
    } catch {
      toast({ title: "Erro ao remover", variant: "destructive" });
    }
  }

  function resumoFiltros(filtros: FiltrosBusca): string {
    const partes: string[] = [];
    if (filtros.cnpj) partes.push(`CNPJ: ${filtros.cnpj}`);
    if (filtros.uf) partes.push(`UF: ${filtros.uf}`);
    if (filtros.keywords) partes.push(`"${filtros.keywords}"`);
    return partes.length > 0 ? partes.join(" · ") : "Busca geral";
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bookmark className="w-4 h-4" />
          Buscas Salvas
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-4">
            <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : buscas.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            Nenhuma busca salva ainda.
            <br />
            Faça uma busca e clique em &quot;Salvar Busca&quot;.
          </p>
        ) : (
          <div className="space-y-3">
            {buscas.map((busca) => (
              <div key={busca.id} className="border rounded p-3 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-sm">{busca.nome}</p>
                    <p className="text-xs text-gray-500">
                      {resumoFiltros(busca.filtros)}
                    </p>
                  </div>
                  {busca.autoImportar && (
                    <Badge variant="outline" className="text-xs">
                      Auto
                    </Badge>
                  )}
                </div>

                {busca.ultimaExecucao && (
                  <p className="text-xs text-gray-400">
                    Última execução:{" "}
                    {new Date(busca.ultimaExecucao).toLocaleDateString("pt-BR")}
                  </p>
                )}

                {busca.totalImportadas > 0 && (
                  <p className="text-xs text-gray-400">
                    Total importadas: {busca.totalImportadas}
                  </p>
                )}

                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs"
                    onClick={() => onExecutar(busca.filtros)}
                  >
                    <Play className="w-3 h-3 mr-1" />
                    Executar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deletarBusca(busca.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
