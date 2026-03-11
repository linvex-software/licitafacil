"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { AlertTriangle, Bot, Captions, CheckCircle2, CircleDotDashed, Play, Pause, Send, Wifi, WifiOff } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AuthGuard } from "@/components/AuthGuard";
import { Layout } from "@/components/layout";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  buscarDisputa,
  encerrarDisputa,
  enviarLanceManual,
  pausarDisputa,
  retomarDisputa,
} from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type EventoUI = {
  tipo: string;
  itemNumero?: number;
  detalhe?: string;
  melhorLance?: number;
  posicao?: number;
  valorEnviado?: number;
  timestamp?: string;
};

type ItemEstado = {
  itemNumero: number;
  posicao?: number;
  melhorLance?: number;
  ultimoLance?: number;
  countdown?: number;
  statusRobo?: "ATIVO" | "PAUSADO" | "CAPTCHA";
};

export default function DisputaAoVivoPage() {
  const { id } = useParams<{ id: string }>();
  const disputaId = id;
  const router = useRouter();
  const { toast } = useToast();
  const socketRef = useRef<Socket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const [socketState, setSocketState] = useState<"conectando" | "conectado" | "desconectado">("conectando");
  const [bannerErro, setBannerErro] = useState<string | null>(null);
  const [bannerCaptcha, setBannerCaptcha] = useState<string | null>(null);
  const [eventos, setEventos] = useState<EventoUI[]>([]);
  const [itensEstado, setItensEstado] = useState<Record<number, ItemEstado>>({});
  const [manualItem, setManualItem] = useState<number>(1);
  const [manualValor, setManualValor] = useState("");

  const { data: disputa, refetch } = useQuery({
    queryKey: ["disputa", disputaId],
    queryFn: () => buscarDisputa(disputaId),
    enabled: !!disputaId,
  });

  const itensConfigurados = useMemo(() => {
    return (disputa?.configuracoes ?? []).filter((config) => config.ativo);
  }, [disputa]);

  useEffect(() => {
    const estadoInicial: Record<number, ItemEstado> = {};
    for (const item of itensConfigurados) {
      estadoInicial[item.itemNumero] = {
        itemNumero: item.itemNumero,
        statusRobo: "ATIVO",
        countdown: 60,
      };
    }
    setItensEstado((prev) => ({ ...estadoInicial, ...prev }));
  }, [itensConfigurados]);

  const tocarAlerta = () => {
    if (typeof window === "undefined") return;
    if (!audioCtxRef.current) {
      audioCtxRef.current = new window.AudioContext();
    }
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = 0.08;
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  };

  useEffect(() => {
    if (!disputaId) return;
    setSocketState("conectando");

    const socket = io(`${API_URL}/disputa`, {
      transports: ["websocket", "polling"],
      query: { disputaId },
    });
    socketRef.current = socket;

    socket.on("connect", () => setSocketState("conectado"));
    socket.on("disconnect", () => setSocketState("desconectado"));
    socket.on("connect_error", () => setSocketState("desconectado"));

    const processarEvento = (eventName: string, payload: EventoUI) => {
      const tipo = payload?.tipo ?? eventName;
      const eventoNormalizado = { ...payload, tipo, timestamp: payload?.timestamp ?? new Date().toISOString() };
      setEventos((prev) => [eventoNormalizado, ...prev]);

      if (tipo === "LANCE_ENVIADO" && payload.itemNumero) {
        const itemNumero = payload.itemNumero;
        setItensEstado((prev) => ({
          ...prev,
          [itemNumero]: {
            ...prev[itemNumero],
            itemNumero,
            melhorLance: payload.melhorLance,
            posicao: payload.posicao,
            ultimoLance: payload.valorEnviado,
            statusRobo: "ATIVO",
          },
        }));
        return;
      }

      if (tipo === "POSICAO_ATUALIZADA" && payload.itemNumero) {
        const itemNumero = payload.itemNumero;
        if (typeof payload.posicao === "number" && payload.posicao > 1) {
          tocarAlerta();
        }
        setItensEstado((prev) => ({
          ...prev,
          [itemNumero]: {
            ...prev[itemNumero],
            itemNumero,
            melhorLance: payload.melhorLance,
            posicao: payload.posicao,
          },
        }));
        return;
      }

      if (tipo === "SESSAO_ENCERRADA") {
        toast({ title: "Sessão encerrada", description: "Redirecionando para listagem de disputas." });
        setTimeout(() => router.push("/disputa"), 1800);
        return;
      }

      if (tipo === "CAPTCHA_DETECTADO") {
        setBannerCaptcha(payload.detalhe ?? "CAPTCHA detectado.");
        setItensEstado((prev) => {
          const next = { ...prev };
          for (const key of Object.keys(next)) {
            const itemNum = Number(key);
            next[itemNum] = { ...next[itemNum], statusRobo: "CAPTCHA" };
          }
          return next;
        });
        setTimeout(() => setBannerCaptcha(null), 15000);
        return;
      }

      if (tipo === "ERRO") {
        setBannerErro(payload.detalhe ?? "Erro na sessão");
      }
    };

    socket.onAny((event, data) => {
      // Debug temporário para validar formato dos eventos no browser.
      console.log("[disputa-ws]", event, data);
    });

    socket.on("LANCE_ENVIADO", (payload: EventoUI) => processarEvento("LANCE_ENVIADO", payload));
    socket.on("POSICAO_ATUALIZADA", (payload: EventoUI) => processarEvento("POSICAO_ATUALIZADA", payload));
    socket.on("SESSAO_ENCERRADA", (payload: EventoUI) => processarEvento("SESSAO_ENCERRADA", payload));
    socket.on("CAPTCHA_DETECTADO", (payload: EventoUI) => processarEvento("CAPTCHA_DETECTADO", payload));
    socket.on("ERRO", (payload: EventoUI) => processarEvento("ERRO", payload));

    // Compatibilidade para gateways que publicam um único evento genérico.
    socket.on("evento", (payload: EventoUI) => processarEvento("evento", payload));
    socket.on("disputa:evento", (payload: EventoUI) => processarEvento("disputa:evento", payload));

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [disputaId, router, toast]);

  useEffect(() => {
    const timer = setInterval(() => {
      setItensEstado((prev) => {
        const next = { ...prev };
        for (const key of Object.keys(next)) {
          const itemNum = Number(key);
          next[itemNum] = {
            ...next[itemNum],
            countdown: Math.max(0, (next[itemNum].countdown ?? 60) - 1),
          };
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const statusWsBadge = () => {
    if (socketState === "conectado") return <Badge variant="success"><Wifi className="w-3 h-3 mr-1" />Conectado</Badge>;
    if (socketState === "conectando") return <Badge variant="warning"><Wifi className="w-3 h-3 mr-1" />Conectando</Badge>;
    return <Badge variant="destructive"><WifiOff className="w-3 h-3 mr-1" />Desconectado</Badge>;
  };

  const executarPausa = async () => {
    await pausarDisputa(disputaId);
    setItensEstado((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        const itemNum = Number(key);
        next[itemNum] = { ...next[itemNum], statusRobo: "PAUSADO" };
      }
      return next;
    });
    toast({ title: "Disputa pausada" });
    await refetch();
  };

  const executarRetomada = async () => {
    await retomarDisputa(disputaId);
    setItensEstado((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        const itemNum = Number(key);
        next[itemNum] = { ...next[itemNum], statusRobo: "ATIVO" };
      }
      return next;
    });
    toast({ title: "Disputa retomada" });
    await refetch();
  };

  const executarEncerramento = async () => {
    await encerrarDisputa(disputaId, "Encerrada manualmente pelo operador");
    toast({ title: "Disputa encerrada" });
    router.push("/disputa");
  };

  const handleLanceManual = async () => {
    const valor = Number(manualValor);
    if (!Number.isFinite(valor) || valor <= 0) {
      toast({ title: "Valor inválido", variant: "destructive" });
      return;
    }
    try {
      await enviarLanceManual(disputaId, {
        itemNumero: manualItem,
        valor,
      });
      toast({ title: "Lance manual enviado" });
      setManualValor("");
    } catch {
      toast({ title: "Falha ao enviar lance manual", variant: "destructive" });
    }
  };

  return (
    <AuthGuard>
      <Layout fullWidth>
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{disputa?.bid?.title ?? "Disputa ao vivo"}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="default">{disputa?.portal ?? "PORTAL"}</Badge>
                <Badge variant={disputa?.status === "AO_VIVO" ? "success" : "warning"}>{disputa?.status ?? "..."}</Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {statusWsBadge()}
              <Button variant="destructive" onClick={() => void executarEncerramento()}>Encerrar</Button>
            </div>
          </div>

          {bannerCaptcha && (
            <div className="p-3 rounded-md border border-amber-300 bg-amber-50 text-amber-800 text-sm">
              CAPTCHA detectado: {bannerCaptcha}
            </div>
          )}
          {bannerErro && (
            <div className="p-3 rounded-md border border-red-300 bg-red-50 text-red-800 text-sm">
              Erro: {bannerErro}
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2 space-y-4">
              {itensConfigurados.map((config) => {
                const item = itensEstado[config.itemNumero];
                const posicao = item?.posicao ?? 99;
                return (
                  <div key={config.id} className="rounded-lg border bg-white dark:bg-gray-900 p-4">
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <p className="font-semibold">Item {config.itemNumero}</p>
                        <p className="text-sm text-gray-500">{config.itemDescricao || "Sem descrição"}</p>
                      </div>
                      <Badge variant={posicao === 1 ? "success" : "destructive"}>
                        {posicao === 1 ? "🥇 1º lugar" : `${posicao}º lugar`}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4 text-sm">
                      <div>
                        <p className="text-gray-500">Último lance robô</p>
                        <p className="font-semibold">{item?.ultimoLance ? `R$ ${item.ultimoLance.toFixed(2)}` : "-"}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Melhor lance</p>
                        <p className="font-semibold">{item?.melhorLance ? `R$ ${item.melhorLance.toFixed(2)}` : "-"}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Countdown</p>
                        <p className="font-semibold">{item?.countdown ?? 0}s</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Status do robô</p>
                        <div className="flex items-center gap-1 font-semibold">
                          <Bot className="w-4 h-4" />
                          {item?.statusRobo ?? "ATIVO"}
                        </div>
                      </div>
                      <div className="flex items-end gap-2 col-span-2 md:col-span-1">
                        <Button size="sm" variant="outline" onClick={() => void executarPausa()}><Pause className="w-4 h-4 mr-1" />Pausar</Button>
                        <Button size="sm" variant="outline" onClick={() => void executarRetomada()}><Play className="w-4 h-4 mr-1" />Retomar</Button>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setManualItem(config.itemNumero);
                          toast({ title: `Lance manual preparado para o item ${config.itemNumero}` });
                        }}
                      >
                        <Send className="w-4 h-4 mr-1" />
                        Lance Manual
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => void executarEncerramento()}>
                        <AlertTriangle className="w-4 h-4 mr-1" />
                        Desistir do item
                      </Button>
                    </div>
                  </div>
                );
              })}

              <div className="rounded-lg border bg-white dark:bg-gray-900 p-4 space-y-3">
                <p className="font-semibold">Lance manual</p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <Input
                    type="number"
                    min={1}
                    value={manualItem}
                    onChange={(e) => setManualItem(Number(e.target.value) || 1)}
                    placeholder="Item"
                  />
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={manualValor}
                    onChange={(e) => setManualValor(e.target.value)}
                    placeholder="Valor do lance"
                  />
                  <Button onClick={() => void handleLanceManual()}><Send className="w-4 h-4 mr-2" />Enviar lance</Button>
                  <Button variant="destructive" onClick={() => void executarEncerramento()}>
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Desistir do item
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-white dark:bg-gray-900 p-4">
              <p className="font-semibold mb-3">Feed de eventos</p>
              <div className="space-y-2 max-h-[65vh] overflow-y-auto">
                {eventos.length === 0 && (
                  <p className="text-sm text-gray-500">Aguardando eventos da sessão...</p>
                )}
                {eventos.map((evento, idx) => (
                  <div key={`${evento.tipo}-${idx}`} className="p-2 rounded border text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold flex items-center gap-1">
                        {evento.tipo === "LANCE_ENVIADO" && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                        {evento.tipo === "POSICAO_ATUALIZADA" && <CircleDotDashed className="w-4 h-4 text-blue-600" />}
                        {evento.tipo === "ERRO" && <AlertTriangle className="w-4 h-4 text-red-600" />}
                        {evento.tipo === "CAPTCHA_DETECTADO" && <Captions className="w-4 h-4 text-amber-600" />}
                        {evento.tipo}
                      </span>
                      <span className="text-xs text-gray-500">
                        {evento.timestamp
                          ? new Date(evento.timestamp).toLocaleTimeString("pt-BR")
                          : "--:--:--"}
                      </span>
                    </div>
                    {typeof evento.itemNumero === "number" && <p>Item: {evento.itemNumero}</p>}
                    {typeof evento.posicao === "number" && <p>Posição: {evento.posicao}</p>}
                    {typeof evento.melhorLance === "number" && <p>Melhor lance: R$ {evento.melhorLance.toFixed(2)}</p>}
                    {evento.detalhe && <p className="text-gray-600">{evento.detalhe}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </AuthGuard>
  );
}
