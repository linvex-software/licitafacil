"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  atualizarStatusPeticao,
  gerarPeticaoDocx,
  listarPeticoesByBid,
  type Peticao,
  type TipoPeticao,
} from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { GerarPeticaoModal } from "./GerarPeticaoModal";

interface JuridicoTabProps {
  bidId: string;
}

const PETICAO_TIPOS: Array<{ tipo: TipoPeticao; label: string }> = [
  { tipo: "IMPUGNACAO", label: "Impugnação" },
  { tipo: "ESCLARECIMENTO", label: "Esclarecimento" },
  { tipo: "RECURSO", label: "Recurso" },
  { tipo: "INTENCAO_RECURSO", label: "Intenção de Recurso" },
  { tipo: "CONTRA_RAZAO", label: "Contrarrazão" },
];

function getStatusLabel(status: string) {
  return status === "ENVIADO" ? "Enviado" : "Rascunho";
}

function getTipoLabel(tipo: TipoPeticao) {
  return PETICAO_TIPOS.find((item) => item.tipo === tipo)?.label || tipo;
}

function formatDateTime(isoDate: string) {
  return format(new Date(isoDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

export function JuridicoTab({ bidId }: JuridicoTabProps) {
  const [peticoes, setPeticoes] = useState<Peticao[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipoSelecionado, setTipoSelecionado] = useState<TipoPeticao | null>(null);
  const [gerando, setGerando] = useState(false);
  const [atualizandoId, setAtualizandoId] = useState<string | null>(null);
  const { toast } = useToast();

  const open = useMemo(() => Boolean(tipoSelecionado), [tipoSelecionado]);

  const carregarHistorico = async () => {
    setLoading(true);
    try {
      const data = await listarPeticoesByBid(bidId);
      setPeticoes(data);
    } catch (err: any) {
      toast({
        title: "Erro ao carregar histórico",
        description: err?.message || "Não foi possível carregar as petições",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarHistorico();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bidId]);

  const fecharModal = () => setTipoSelecionado(null);

  const handleGerarPeticao = async (body: {
    conteudo: string;
    cnpj?: string;
    endereco?: string;
    cidade?: string;
  }) => {
    if (!tipoSelecionado) return;
    setGerando(true);
    try {
      const { blob, fileName } = await gerarPeticaoDocx({
        bidId,
        tipo: tipoSelecionado,
        ...body,
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Petição gerada",
        description: "O download do arquivo .docx foi iniciado.",
      });
      fecharModal();
      await carregarHistorico();
    } finally {
      setGerando(false);
    }
  };

  const marcarComoEnviado = async (peticaoId: string) => {
    setAtualizandoId(peticaoId);
    try {
      await atualizarStatusPeticao(peticaoId, "ENVIADO");
      setPeticoes((prev) =>
        prev.map((item) =>
          item.id === peticaoId
            ? { ...item, status: "ENVIADO", dataEnvio: new Date().toISOString() }
            : item,
        ),
      );
      toast({
        title: "Status atualizado",
        description: "Petição marcada como enviada.",
      });
    } catch (err: any) {
      toast({
        title: "Erro ao atualizar status",
        description: err?.message || "Não foi possível atualizar o status",
        variant: "destructive",
      });
    } finally {
      setAtualizandoId(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-sm border-gray-200 dark:border-gray-700">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-2">
            {PETICAO_TIPOS.map((item) => (
              <Button
                key={item.tipo}
                variant="outline"
                className="border-gray-200 dark:border-gray-700"
                onClick={() => setTipoSelecionado(item.tipo)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-gray-200 dark:border-gray-700">
        <CardContent className="pt-6">
          <h3 className="text-lg font-heading font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Histórico de petições
          </h3>

          {loading ? (
            <div className="text-sm text-gray-500 dark:text-gray-400">Carregando histórico...</div>
          ) : peticoes.length === 0 ? (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Nenhuma petição gerada para esta licitação.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Data de geração</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {peticoes.map((peticao) => (
                  <TableRow key={peticao.id}>
                    <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                      {getTipoLabel(peticao.tipo)}
                    </TableCell>
                    <TableCell>{formatDateTime(peticao.createdAt)}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                          peticao.status === "ENVIADO"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                        }`}
                      >
                        {getStatusLabel(peticao.status)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={peticao.status === "ENVIADO" || atualizandoId === peticao.id}
                        onClick={() => marcarComoEnviado(peticao.id)}
                      >
                        {peticao.status === "ENVIADO" ? "Enviado" : "Marcar como Enviado"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <GerarPeticaoModal
        open={open}
        tipo={tipoSelecionado}
        submitting={gerando}
        onClose={fecharModal}
        onSubmit={handleGerarPeticao}
      />
    </div>
  );
}
