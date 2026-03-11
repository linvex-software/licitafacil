"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AuthGuard } from "@/components/AuthGuard";
import { Layout } from "@/components/layout";
import { NovaDisputaModal } from "@/components/disputa/NovaDisputaModal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cancelarDisputa, listarDisputas, type Disputa } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

type AbaStatus = "ATIVAS" | "AGENDADAS" | "ENCERRADAS";

function badgePortal(portal: Disputa["portal"]) {
  return portal === "COMPRASNET" ? "default" : "secondary";
}

function badgeStatus(status: Disputa["status"]): "default" | "secondary" | "success" | "warning" | "destructive" {
  if (status === "AO_VIVO") return "success";
  if (status === "AGENDADA" || status === "INICIANDO") return "warning";
  if (status === "ENCERRADA") return "secondary";
  if (status === "ERRO" || status === "CANCELADA") return "destructive";
  return "default";
}

function labelStatus(status: Disputa["status"]) {
  return status
    .replace("AO_VIVO", "AO VIVO")
    .replace("INICIANDO", "INICIANDO")
    .replace("ENCERRADA", "ENCERRADA")
    .replace("CANCELADA", "CANCELADA")
    .replace("AGENDADA", "AGENDADA")
    .replace("PAUSADA", "PAUSADA")
    .replace("ERRO", "ERRO");
}

export default function DisputaPage() {
  const { toast } = useToast();
  const [aba, setAba] = useState<AbaStatus>("ATIVAS");
  const [cancelandoId, setCancelandoId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["disputas"],
    queryFn: listarDisputas,
    staleTime: 8000,
    refetchInterval: 10000,
    placeholderData: (previousData) => previousData,
    refetchIntervalInBackground: false,
  });

  const disputasFiltradas = useMemo(() => {
    const list = data ?? [];
    if (aba === "ATIVAS") {
      return list.filter((d) => ["INICIANDO", "AO_VIVO", "PAUSADA"].includes(d.status));
    }
    if (aba === "AGENDADAS") {
      return list.filter((d) => d.status === "AGENDADA");
    }
    return list.filter((d) => ["ENCERRADA", "CANCELADA", "ERRO"].includes(d.status));
  }, [aba, data]);

  const cancelar = async (id: string) => {
    setCancelandoId(id);
    try {
      await cancelarDisputa(id);
      toast({ title: "Disputa cancelada" });
      await refetch();
    } catch {
      toast({ title: "Falha ao cancelar disputa", variant: "destructive" });
    } finally {
      setCancelandoId(null);
    }
  };

  return (
    <AuthGuard>
      <Layout>
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-heading font-extrabold text-gray-900 dark:text-gray-100">Disputas</h1>
              <p className="text-gray-500 dark:text-gray-400">Gerencie e monitore suas sessões de lance automático</p>
            </div>
            <NovaDisputaModal onSuccess={() => void refetch()} />
          </div>

          <Tabs value={aba} onValueChange={(value) => setAba(value as AbaStatus)}>
            <TabsList>
              <TabsTrigger value="ATIVAS">Ativas</TabsTrigger>
              <TabsTrigger value="AGENDADAS">Agendadas</TabsTrigger>
              <TabsTrigger value="ENCERRADAS">Encerradas</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
            <table className="w-full min-w-[960px]">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="text-left p-3 text-xs text-gray-500">Licitação vinculada</th>
                  <th className="text-left p-3 text-xs text-gray-500">Portal</th>
                  <th className="text-left p-3 text-xs text-gray-500">Status</th>
                  <th className="text-left p-3 text-xs text-gray-500">Agendado para / Iniciado em</th>
                  <th className="text-right p-3 text-xs text-gray-500">Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td className="p-4 text-sm text-gray-500" colSpan={5}>Carregando disputas...</td>
                  </tr>
                )}

                {!isLoading && disputasFiltradas.length === 0 && (
                  <tr>
                    <td className="p-8" colSpan={5}>
                      <div className="text-center space-y-3">
                        <p className="text-gray-600 dark:text-gray-300 font-medium">Nenhuma disputa encontrada nesta aba</p>
                        <p className="text-sm text-gray-500">Crie sua primeira disputa para começar o monitoramento automático.</p>
                        <div>
                          <NovaDisputaModal onSuccess={() => void refetch()} />
                        </div>
                      </div>
                    </td>
                  </tr>
                )}

                {disputasFiltradas.map((disputa) => (
                  <tr key={disputa.id} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="p-3">
                      <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{disputa.bid?.title ?? "Sem licitação vinculada"}</p>
                      <p className="text-xs text-gray-500">{disputa.bid?.agency ?? "-"}</p>
                    </td>
                    <td className="p-3">
                      <Badge variant={badgePortal(disputa.portal)}>{disputa.portal}</Badge>
                    </td>
                    <td className="p-3">
                      <Badge variant={badgeStatus(disputa.status)}>{labelStatus(disputa.status)}</Badge>
                    </td>
                    <td className="p-3 text-sm text-gray-600 dark:text-gray-300">
                      {disputa.agendadoPara && <p>Agendado: {new Date(disputa.agendadoPara).toLocaleString("pt-BR")}</p>}
                      {disputa.iniciadoEm && <p>Iniciado: {new Date(disputa.iniciadoEm).toLocaleString("pt-BR")}</p>}
                      {!disputa.agendadoPara && !disputa.iniciadoEm && "-"}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-2">
                        {disputa.status === "AO_VIVO" && (
                          <Link href={`/disputa/${disputa.id}/ao-vivo`}>
                            <Button size="sm">Ao Vivo</Button>
                          </Link>
                        )}
                        {["ENCERRADA", "CANCELADA", "ERRO"].includes(disputa.status) && (
                          <Link href={`/disputa/${disputa.id}/ao-vivo`}>
                            <Button size="sm" variant="outline">Ver</Button>
                          </Link>
                        )}
                        {disputa.status === "AGENDADA" && (
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={cancelandoId === disputa.id}
                            onClick={() => void cancelar(disputa.id)}
                          >
                            {cancelandoId === disputa.id ? "Cancelando..." : "Cancelar"}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Layout>
    </AuthGuard>
  );
}
