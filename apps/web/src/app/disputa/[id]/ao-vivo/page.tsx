"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AuthGuard } from "@/components/AuthGuard";
import { Layout } from "@/components/layout";
import { FeedEventos } from "@/components/disputa/FeedEventos";
import { HeaderDisputa } from "@/components/disputa/HeaderDisputa";
import { PainelItem } from "@/components/disputa/PainelItem";
import { useToast } from "@/hooks/use-toast";
import { useDisputaSocket } from "@/hooks/useDisputaSocket";
import { buscarDisputa, isBillingHandledError } from "@/lib/api";
import Link from "next/link";

export default function DisputaAoVivoPage() {
  const { id } = useParams<{ id: string }>();
  const disputaId = id;
  const { toast } = useToast();

  const { data: disputa, isLoading, error } = useQuery({
    queryKey: ["disputa", disputaId],
    queryFn: () => buscarDisputa(disputaId),
    enabled: Boolean(disputaId),
    retry: (failureCount, err) => !isBillingHandledError(err) && failureCount < 1,
  });

  const {
    itens,
    feed,
    statusConexao,
    statusExtensao,
    statusDisputa,
    darLance,
    limparFeed,
    ultimoLanceConfirmadoId,
  } = useDisputaSocket({ disputaId, disputaInicial: disputa });

  const titulo = disputa?.bid
    ? `${disputa.bid.title} — ${disputa.bid.agency}`
    : "Disputa ao vivo";

  const urlPortal =
    disputa?.bid?.pregoesMonitorados?.[0]?.urlSalaDisputa ??
    disputa?.bid?.pregoesMonitorados?.[0]?.linkPncp ??
    (disputa?.bidId ? `/licitacoes/${disputa.bidId}` : null);

  useEffect(() => {
    if (!ultimoLanceConfirmadoId) return;
    toast({
      title: "Lance confirmado",
      description: "A extensão confirmou o envio do lance no portal.",
    });
  }, [toast, ultimoLanceConfirmadoId]);

  useEffect(() => {
    if (!disputaId) return;
    window.postMessage({ tipo: "LVX_ATUALIZAR_DISPUTA_ATIVA", disputaId }, "*");
  }, [disputaId]);

  if (error && isBillingHandledError(error)) {
    return (
      <AuthGuard>
        <Layout fullWidth>
          <div className="min-h-[50vh]" aria-hidden />
        </Layout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <Layout fullWidth>
        <div className="h-[calc(100vh-7.5rem)] flex flex-col overflow-hidden">
          <HeaderDisputa
            titulo={titulo}
            statusConexao={statusConexao}
            statusExtensao={statusExtensao}
            status={statusDisputa ?? disputa?.status ?? null}
            urlPortal={urlPortal}
          />

          {isLoading ? (
            <div className="flex-1 grid place-items-center text-muted-foreground">Carregando disputa...</div>
          ) : (
            <div className="flex-1 pt-4 overflow-hidden">
              {statusExtensao === "desconectada" && (
                <div className="mb-3 mx-1 rounded-md border border-amber-700 bg-amber-950 px-3 py-2 text-sm text-amber-300">
                  Extensão desconectada.{" "}
                  <Link href="/extensao" className="underline font-medium">
                    Ir para página da extensão
                  </Link>
                </div>
              )}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 h-full">
                <section className="lg:col-span-3 overflow-y-auto pr-1 space-y-4">
                  {itens.map((item) => (
                    <PainelItem
                      key={item.itemNumero}
                      item={item}
                      onLance={darLance}
                    />
                  ))}
                </section>

                <section className="lg:col-span-2 overflow-hidden">
                  <FeedEventos
                    eventos={feed}
                    onLimpar={limparFeed}
                  />
                </section>
              </div>
            </div>
          )}
        </div>
      </Layout>
    </AuthGuard>
  );
}
