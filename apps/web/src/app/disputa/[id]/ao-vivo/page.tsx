"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AuthGuard } from "@/components/AuthGuard";
import { Layout } from "@/components/layout";
import { FeedEventos } from "@/components/disputa/FeedEventos";
import { HeaderDisputa } from "@/components/disputa/HeaderDisputa";
import { PainelItem } from "@/components/disputa/PainelItem";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useDisputaSocket } from "@/hooks/useDisputaSocket";
import { buscarDisputa, type DisputaStatus } from "@/lib/api";

function isPausada(status: DisputaStatus | null) {
  return status === "PAUSADA" || status === ("PAUSADO" as DisputaStatus);
}

export default function DisputaAoVivoPage() {
  const { id } = useParams<{ id: string }>();
  const disputaId = id;
  const { toast } = useToast();
  const [clearTimestamp, setClearTimestamp] = useState<number>(0);

  const { data: disputa, isLoading } = useQuery({
    queryKey: ["disputa", disputaId],
    queryFn: () => buscarDisputa(disputaId),
    enabled: Boolean(disputaId),
  });

  const {
    conectado,
    reconectando,
    eventos,
    posicoes,
    status,
    captchaAtivo,
    pausar,
    retomar,
    enviarLanceManual,
    desistirItem,
  } = useDisputaSocket({ disputaId });

  const statusGlobal = status ?? disputa?.status ?? null;
  const itens = useMemo(
    () => (disputa?.configuracoes ?? []).filter((item) => item.ativo),
    [disputa?.configuracoes],
  );

  const eventosVisiveis = useMemo(
    () => eventos.filter((evento) => new Date(evento.timestamp).getTime() >= clearTimestamp),
    [clearTimestamp, eventos],
  );

  const titulo = disputa?.bid
    ? `${disputa.bid.title} — ${disputa.bid.agency}`
    : "Disputa ao vivo";

  const urlPortal = (disputa as unknown as { urlPortal?: string | null } | undefined)?.urlPortal;

  const handleTogglePausa = () => {
    if (isPausada(statusGlobal)) {
      retomar();
      toast({ title: "Robô retomado" });
      return;
    }
    pausar();
    toast({ title: "Robô pausado" });
  };

  const handleLanceManual = (itemId: string, valor: number) => {
    enviarLanceManual(itemId, valor);
    toast({ title: "Lance manual enviado" });
  };

  const handleDesistir = (itemId: string) => {
    desistirItem(itemId);
    toast({ title: `Desistencia enviada para o item ${itemId}` });
  };

  return (
    <AuthGuard>
      <Layout fullWidth>
        <div className="h-[calc(100vh-7.5rem)] flex flex-col overflow-hidden">
          <HeaderDisputa
            titulo={titulo}
            conectado={conectado}
            reconectando={reconectando}
            status={statusGlobal}
            urlPortal={urlPortal}
            onTogglePausa={handleTogglePausa}
          />

          {isLoading ? (
            <div className="flex-1 grid place-items-center text-muted-foreground">Carregando disputa...</div>
          ) : (
            <div className="flex-1 pt-4 overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 h-full">
                <section className="lg:col-span-3 overflow-y-auto pr-1 space-y-4">
                  {itens.map((item) => (
                    <PainelItem
                      key={item.id}
                      item={item}
                      posicao={posicoes[String(item.itemNumero)]}
                      statusGlobal={statusGlobal}
                      onPausar={pausar}
                      onRetomar={retomar}
                      onLanceManual={handleLanceManual}
                      onDesistir={handleDesistir}
                    />
                  ))}
                </section>

                <section className="lg:col-span-2 overflow-hidden">
                  <FeedEventos
                    eventos={eventosVisiveis}
                    onLimpar={() => setClearTimestamp(Date.now())}
                  />
                </section>
              </div>
            </div>
          )}
        </div>

        {captchaAtivo && (
          <div className="fixed inset-0 bg-black/70 z-50 grid place-items-center p-4">
            <div className="w-full max-w-xl bg-card border border-red-500/50 rounded-lg p-6 space-y-4">
              <h2 className="text-lg font-semibold text-red-400">CAPTCHA DETECTADO</h2>
              <p className="text-sm text-muted-foreground">
                O robô pausou automaticamente. Resolva o CAPTCHA no portal e clique em
                {" "}
                <strong>Retomar</strong>
                {" "}
                para continuar.
              </p>
              <div className="flex flex-wrap gap-2">
                {urlPortal && (
                  <a href={urlPortal} target="_blank" rel="noreferrer">
                    <Button variant="outline">Abrir Portal</Button>
                  </a>
                )}
                <Button onClick={retomar}>Retomar Robô</Button>
              </div>
            </div>
          </div>
        )}
      </Layout>
    </AuthGuard>
  );
}
