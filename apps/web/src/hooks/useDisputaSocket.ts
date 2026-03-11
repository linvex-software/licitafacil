"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { DisputaStatus } from "@/lib/api";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const MAX_EVENTOS = 200;

export interface EventoDisputa {
  tipo: string;
  descricao: string;
  valor?: number;
  itemId?: string;
  timestamp: string;
}

export interface PosicaoItem {
  itemId: string;
  posicao: number;
  melhorLance: number;
  meuUltimoLance: number;
  foraLiderancaEm?: Date;
}

interface UseDisputaSocketReturn {
  conectado: boolean;
  reconectando: boolean;
  eventos: EventoDisputa[];
  posicoes: Record<string, PosicaoItem>;
  status: DisputaStatus | null;
  captchaAtivo: boolean;
  captchaItemId: string | null;
  pausar: () => void;
  retomar: () => void;
  enviarLanceManual: (itemId: string, valor: number) => void;
  desistirItem: (itemId: string) => void;
}

interface UseDisputaSocketParams {
  disputaId: string;
}

function tocarAlertaSonoro() {
  if (typeof window === "undefined") return;
  const ctx = new window.AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = 880;
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
  osc.start();
  osc.stop(ctx.currentTime + 0.5);
}

function nowIso() {
  return new Date().toISOString();
}

function normalizarItemId(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function normalizarEvento(payload: unknown, tipoFallback: string): EventoDisputa {
  const data = (payload ?? {}) as Record<string, unknown>;
  const itemId = normalizarItemId(data.itemId ?? data.itemNumero);

  return {
    tipo: typeof data.tipo === "string" ? data.tipo : tipoFallback,
    descricao:
      typeof data.descricao === "string"
        ? data.descricao
        : typeof data.detalhe === "string"
          ? data.detalhe
          : tipoFallback,
    valor:
      typeof data.valor === "number"
        ? data.valor
        : typeof data.valorEnviado === "number"
          ? data.valorEnviado
          : undefined,
    itemId: itemId ?? undefined,
    timestamp: typeof data.timestamp === "string" ? data.timestamp : nowIso(),
  };
}

function parseStatus(status: unknown): DisputaStatus | null {
  if (typeof status !== "string") return null;
  return status as DisputaStatus;
}

export function useDisputaSocket({ disputaId }: UseDisputaSocketParams): UseDisputaSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [conectado, setConectado] = useState(false);
  const [reconectando, setReconectando] = useState(false);
  const [eventos, setEventos] = useState<EventoDisputa[]>([]);
  const [posicoes, setPosicoes] = useState<Record<string, PosicaoItem>>({});
  const [status, setStatus] = useState<DisputaStatus | null>(null);
  const [captchaAtivo, setCaptchaAtivo] = useState(false);
  const [captchaItemId, setCaptchaItemId] = useState<string | null>(null);

  const pushEvento = useCallback((evento: EventoDisputa) => {
    setEventos((prev) => [evento, ...prev].slice(0, MAX_EVENTOS));
  }, []);

  useEffect(() => {
    if (!disputaId) return;

    const token = typeof window !== "undefined" ? window.localStorage.getItem("token") : null;
    const socket = io(`${apiUrl}/disputa`, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConectado(true);
      setReconectando(false);
      socket.emit("disputa:join", { disputaId });
    });

    socket.on("disconnect", () => {
      setConectado(false);
      setReconectando(true);
    });

    socket.io.on("reconnect_attempt", () => {
      setReconectando(true);
    });

    socket.io.on("reconnect", () => {
      setConectado(true);
      setReconectando(false);
      socket.emit("disputa:join", { disputaId });
    });

    socket.on("connect_error", () => {
      setConectado(false);
      setReconectando(true);
    });

    socket.on("disputa:evento", (payload: unknown) => {
      pushEvento(normalizarEvento(payload, "EVENTO"));
    });

    const handlePosicao = (payload: unknown) => {
      const data = (payload ?? {}) as Record<string, unknown>;
      const itemId = normalizarItemId(data.itemId ?? data.itemNumero);
      if (!itemId) return;

      const posicao = typeof data.posicao === "number" ? data.posicao : 99;
      const melhorLance = typeof data.melhorLance === "number" ? data.melhorLance : 0;
      const meuUltimoLance =
        typeof data.meuUltimoLance === "number"
          ? data.meuUltimoLance
          : typeof data.valorEnviado === "number"
            ? data.valorEnviado
            : 0;

      setPosicoes((prev) => {
        const anterior = prev[itemId];
        const saiuDaLideranca = anterior?.posicao === 1 && posicao > 1;

        if (saiuDaLideranca) {
          tocarAlertaSonoro();
        }

        return {
          ...prev,
          [itemId]: {
            itemId,
            posicao,
            melhorLance,
            meuUltimoLance,
            foraLiderancaEm:
              posicao > 1
                ? anterior?.foraLiderancaEm ?? (saiuDaLideranca ? new Date() : undefined)
                : undefined,
          },
        };
      });
    };

    socket.on("disputa:posicao", handlePosicao);
    socket.on("POSICAO_ATUALIZADA", handlePosicao);

    socket.on("disputa:status", (payload: unknown) => {
      const data = payload as { status?: DisputaStatus };
      const parsed = parseStatus(data?.status);
      if (parsed) setStatus(parsed);
    });

    socket.on("disputa:captcha", (payload: unknown) => {
      const data = payload as { itemId?: string };
      setCaptchaAtivo(true);
      setCaptchaItemId(data?.itemId ?? null);
      pushEvento(normalizarEvento(payload, "CAPTCHA_DETECTADO"));
    });

    socket.on("CAPTCHA_DETECTADO", (payload: unknown) => {
      const data = payload as { itemId?: string; itemNumero?: number };
      const itemId = normalizarItemId(data?.itemId ?? data?.itemNumero);
      setCaptchaAtivo(true);
      setCaptchaItemId(itemId);
      pushEvento(normalizarEvento(payload, "CAPTCHA_DETECTADO"));
    });

    socket.on("disputa:item_encerrado", (payload: unknown) => {
      const data = (payload ?? {}) as Record<string, unknown>;
      const resultado = typeof data.resultado === "string" ? data.resultado : "PERDEU";
      pushEvento(
        normalizarEvento(payload, `ITEM_ENCERRADO_${resultado}`),
      );
    });

    socket.on("SESSAO_ENCERRADA", (payload: unknown) => {
      pushEvento(normalizarEvento(payload, "SESSAO_ENCERRADA"));
    });

    socket.on("ERRO", (payload: unknown) => {
      pushEvento(normalizarEvento(payload, "ERRO"));
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [disputaId, pushEvento]);

  const actions = useMemo(() => {
    const pausar = () => {
      socketRef.current?.emit("disputa:pausar", { disputaId });
      setStatus("PAUSADA");
    };

    const retomar = () => {
      socketRef.current?.emit("disputa:retomar", { disputaId });
      setStatus("AO_VIVO");
      setCaptchaAtivo(false);
      setCaptchaItemId(null);
    };

    const enviarLanceManual = (itemId: string, valor: number) => {
      socketRef.current?.emit("disputa:lance_manual", { disputaId, itemId, valor });
    };

    const desistirItem = (itemId: string) => {
      socketRef.current?.emit("disputa:desistir_item", { disputaId, itemId });
    };

    return { pausar, retomar, enviarLanceManual, desistirItem };
  }, [disputaId]);

  return {
    conectado,
    reconectando,
    eventos,
    posicoes,
    status,
    captchaAtivo,
    captchaItemId,
    ...actions,
  };
}
