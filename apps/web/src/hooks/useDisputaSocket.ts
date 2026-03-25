"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { Disputa, DisputaStatus } from "@/lib/api";
import { getToken } from "@/lib/auth";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const MAX_EVENTOS = 200;
const EXTENSAO_TTL_MS = 15000;

export type StatusConexao = "conectando" | "conectado" | "desconectado";
export type StatusExtensao = "desconhecida" | "conectada" | "desconectada";

export interface EventoAoVivo {
  id: string;
  ts: number;
  itemNumero?: number;
  tipo:
    | "SNAPSHOT"
    | "POSICAO_PERDIDA"
    | "POSICAO_ATUALIZADA"
    | "LANCE_SOLICITADO"
    | "LANCE_CONFIRMADO"
    | "ITEM_ENCERRADO"
    | "RESULTADO"
    | "MENSAGEM"
    | "ERRO";
  texto: string;
  valor?: number;
  severidade: "info" | "ok" | "warn" | "danger";
}

export interface ItemAoVivo {
  itemNumero: number;
  descricao?: string | null;
  melhorLance?: number | null;
  posicaoAtual?: number | null;
  statusItem: string;
  vencedor?: string | null;
  valorFinal?: number | null;
  ultimoLanceOperador?: number | null;
  lancePendente?: { valor: number; iniciadoEm: number } | null;
  lanceConfirmadoEm?: number | null;
  perdeuLiderancaEm?: number | null;
}

interface UseDisputaSocketParams {
  disputaId: string;
  disputaInicial?: Disputa | null;
}

interface UseDisputaSocketReturn {
  itens: ItemAoVivo[];
  feed: EventoAoVivo[];
  statusConexao: StatusConexao;
  statusExtensao: StatusExtensao;
  statusDisputa: DisputaStatus | null;
  darLance: (itemNumero: number, valor: number) => void;
  limparFeed: () => void;
  ultimoLanceConfirmadoId: string | null;
}

function toqueAlerta() {
  if (typeof window === "undefined" || typeof window.AudioContext === "undefined") return;
  try {
    const ctx = new window.AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // no-op
  }
}

function numero(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim().length > 0) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function toMs(value?: string | number | Date): number {
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return Date.now();
}

function feedId(prefix: string, itemNumero?: number, ts?: number) {
  return `${prefix}-${itemNumero ?? "na"}-${ts ?? Date.now()}`;
}

function fromDisputa(d?: Disputa | null): Record<number, ItemAoVivo> {
  if (!d) return {};
  const byNum: Record<number, ItemAoVivo> = {};
  for (const c of d.configuracoes ?? []) {
    byNum[c.itemNumero] = {
      itemNumero: c.itemNumero,
      descricao: c.itemDescricao ?? null,
      melhorLance: c.melhorLance ?? null,
      posicaoAtual: c.posicaoAtual ?? null,
      statusItem: c.statusItem ?? "AGUARDANDO",
      vencedor: c.vencedor ?? null,
      valorFinal: c.valorFinal ?? null,
      ultimoLanceOperador: null,
      lancePendente: null,
      lanceConfirmadoEm: null,
      perdeuLiderancaEm: null,
    };
  }
  return byNum;
}

function historicoToFeed(d?: Disputa | null): EventoAoVivo[] {
  const hist = d?.historico ?? [];
  const eventos = hist
    .slice(-MAX_EVENTOS)
    .map((h) => {
      const ts = toMs(h.timestamp);
      const itemNumero = h.itemNumero ?? undefined;
      return {
        id: feedId(h.evento, itemNumero, ts),
        ts,
        itemNumero,
        tipo: h.evento === "LANCE_ENVIADO" ? "LANCE_CONFIRMADO" : "MENSAGEM",
        texto: h.detalhe || h.evento,
        valor: h.valorEnviado ?? undefined,
        severidade: h.evento === "ERRO" ? "danger" : "info",
      } as EventoAoVivo;
    })
    .sort((a, b) => a.ts - b.ts);
  return eventos.slice(-MAX_EVENTOS);
}

export function useDisputaSocket({
  disputaId,
  disputaInicial,
}: UseDisputaSocketParams): UseDisputaSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [statusConexao, setStatusConexao] = useState<StatusConexao>("conectando");
  const [statusDisputa, setStatusDisputa] = useState<DisputaStatus | null>(disputaInicial?.status ?? null);
  const [itensByNum, setItensByNum] = useState<Record<number, ItemAoVivo>>(() => fromDisputa(disputaInicial));
  const [feed, setFeed] = useState<EventoAoVivo[]>(() => historicoToFeed(disputaInicial));
  const [ultimoSnapshotMs, setUltimoSnapshotMs] = useState<number>(0);
  const [statusExtensao, setStatusExtensao] = useState<StatusExtensao>("desconhecida");
  const [statusWsExtensao, setStatusWsExtensao] = useState<StatusExtensao>("desconhecida");
  const [ultimoLanceConfirmadoId, setUltimoLanceConfirmadoId] = useState<string | null>(null);

  const appendFeed = useCallback((evento: EventoAoVivo) => {
    setFeed((prev) => {
      if (prev.some((e) => e.id === evento.id)) return prev;
      const next = [...prev, evento];
      return next.slice(-MAX_EVENTOS);
    });
  }, []);

  useEffect(() => {
    if (!disputaInicial) return;
    setStatusDisputa(disputaInicial.status ?? null);
    setItensByNum(fromDisputa(disputaInicial));
    setFeed(historicoToFeed(disputaInicial));
  }, [disputaInicial]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (statusWsExtensao === "conectada") {
        setStatusExtensao("conectada");
        return;
      }
      if (!ultimoSnapshotMs) return;
      const vivo = Date.now() - ultimoSnapshotMs < EXTENSAO_TTL_MS;
      setStatusExtensao(vivo ? "conectada" : "desconectada");
    }, 2000);
    return () => window.clearInterval(timer);
  }, [statusWsExtensao, ultimoSnapshotMs]);

  useEffect(() => {
    const onMsg = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (data.tipo !== "LVX_STATUS_EXTENSAO_RESULT") return;
      const status = data.status === "conectado" ? "conectada" : "desconectada";
      setStatusWsExtensao(status);
      setStatusExtensao((prev) => {
        if (status === "conectada") return "conectada";
        if (prev === "conectada" && Date.now() - ultimoSnapshotMs < EXTENSAO_TTL_MS) return "conectada";
        return "desconectada";
      });
    };

    window.addEventListener("message", onMsg);
    const timer = window.setInterval(() => {
      window.postMessage({ tipo: "LVX_STATUS_EXTENSAO" }, "*");
    }, 3000);
    window.postMessage({ tipo: "LVX_STATUS_EXTENSAO" }, "*");

    return () => {
      window.removeEventListener("message", onMsg);
      window.clearInterval(timer);
    };
  }, [ultimoSnapshotMs]);

  useEffect(() => {
    if (!disputaId) return;
    const token = getToken();
    const socket = io(`${apiUrl}/disputa`, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 10000,
      reconnectionAttempts: Infinity,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setStatusConexao("conectado");
      socket.emit("disputa:join", { disputaId });
    });
    socket.on("disconnect", () => {
      setStatusConexao("desconectado");
      setStatusExtensao("desconectada");
    });
    socket.on("connect_error", () => {
      setStatusConexao("desconectado");
    });
    socket.io.on("reconnect_attempt", () => {
      setStatusConexao("conectando");
    });
    socket.io.on("reconnect", () => {
      setStatusConexao("conectado");
      socket.emit("disputa:join", { disputaId });
    });

    socket.on("disputa:update", (payload: unknown) => {
      const data = (payload ?? {}) as Record<string, unknown>;
      const tipo = typeof data.tipo === "string" ? data.tipo : "snapshot";
      const now = Date.now();

      if (tipo === "snapshot") {
        const itens = Array.isArray(data.itens) ? data.itens : [];
        setItensByNum((prev) => {
          const next = { ...prev };
          for (const raw of itens) {
            const x = raw as Record<string, unknown>;
            const itemNumero = numero(x.itemNumero);
            if (!itemNumero) continue;
            const prevPos = next[itemNumero]?.posicaoAtual ?? null;
            const posicaoAtual = numero(x.posicaoAtual);
            const perdeu = prevPos === 1 && posicaoAtual != null && posicaoAtual > 1;
            if (perdeu) {
              toqueAlerta();
              appendFeed({
                id: feedId("posicao-perdida", itemNumero, now),
                ts: now,
                itemNumero,
                tipo: "POSICAO_PERDIDA",
                texto: `Posição perdida no item ${itemNumero}: agora em ${posicaoAtual}º`,
                severidade: "warn",
              });
            }
            next[itemNumero] = {
              ...next[itemNumero],
              itemNumero,
              descricao: (x.itemDescricao as string | null | undefined) ?? next[itemNumero]?.descricao ?? null,
              melhorLance: numero(x.melhorLance),
              posicaoAtual,
              statusItem: (x.statusItem as string | undefined) ?? next[itemNumero]?.statusItem ?? "AGUARDANDO",
              vencedor: (x.vencedor as string | null | undefined) ?? null,
              valorFinal: numero(x.valorFinal),
              perdeuLiderancaEm: perdeu ? now : posicaoAtual === 1 ? null : (next[itemNumero]?.perdeuLiderancaEm ?? null),
            };
          }
          return next;
        });
        appendFeed({
          id: feedId("snapshot", undefined, now),
          ts: now,
          tipo: "SNAPSHOT",
          texto: "Snapshot da extensão recebido",
          severidade: "info",
        });
        setUltimoSnapshotMs(now);
        setStatusExtensao("conectada");
        return;
      }

      if (tipo === "item_encerrado") {
        const itemNumero = numero(data.itemNumero) ?? undefined;
        if (itemNumero) {
          setItensByNum((prev) => ({
            ...prev,
            [itemNumero]: {
              ...prev[itemNumero],
              itemNumero,
              statusItem: "ENCERRADO",
            },
          }));
        }
        appendFeed({
          id: feedId("item-encerrado", itemNumero, now),
          ts: now,
          itemNumero,
          tipo: "ITEM_ENCERRADO",
          texto: `Item ${itemNumero ?? "-"} encerrado`,
          severidade: "warn",
        });
        return;
      }

      if (tipo === "resultado") {
        const status = (data.status as DisputaStatus | undefined) ?? null;
        if (status) setStatusDisputa(status);
        appendFeed({
          id: feedId("resultado", undefined, now),
          ts: now,
          tipo: "RESULTADO",
          texto: `Resultado registrado: ${String(data.resultado ?? "-")}`,
          severidade: "ok",
        });
      }
    });

    socket.on("extensao:lance_confirmado", (payload: unknown) => {
      const data = (payload ?? {}) as Record<string, unknown>;
      const itemNumero = numero(data.itemNumero);
      const valor = numero(data.valor);
      const posicao = numero(data.posicao);
      const ts = toMs(data.timestamp as string | undefined);
      if (itemNumero) {
        setItensByNum((prev) => ({
          ...prev,
          [itemNumero]: {
            ...prev[itemNumero],
            itemNumero,
            ultimoLanceOperador: valor,
            posicaoAtual: posicao ?? prev[itemNumero]?.posicaoAtual ?? null,
            lancePendente: null,
            lanceConfirmadoEm: ts,
          },
        }));
      }
      const id = feedId("confirmado", itemNumero ?? undefined, ts);
      setUltimoLanceConfirmadoId(id);
      appendFeed({
        id,
        ts,
        itemNumero: itemNumero ?? undefined,
        tipo: "LANCE_CONFIRMADO",
        texto: `Lance confirmado no portal para item ${itemNumero ?? "-"}`,
        valor: valor ?? undefined,
        severidade: "ok",
      });
    });

    socket.on("ERRO", (payload: unknown) => {
      const data = (payload ?? {}) as Record<string, unknown>;
      const ts = toMs(data.timestamp as string | undefined);
      appendFeed({
        id: feedId("erro", undefined, ts),
        ts,
        tipo: "ERRO",
        texto: typeof data.detalhe === "string" ? data.detalhe : "Erro na disputa",
        severidade: "danger",
      });
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [appendFeed, disputaId]);

  const darLance = useCallback(
    (itemNumero: number, valor: number) => {
      if (!Number.isFinite(valor) || valor <= 0) return;
      socketRef.current?.emit("disputa:preencher_lance", {
        disputaId,
        itemNumero,
        valor,
      });
      const ts = Date.now();
      setItensByNum((prev) => ({
        ...prev,
        [itemNumero]: {
          ...prev[itemNumero],
          itemNumero,
          lancePendente: { valor, iniciadoEm: ts },
        },
      }));
      appendFeed({
        id: feedId("lance-solicitado", itemNumero, ts),
        ts,
        itemNumero,
        tipo: "LANCE_SOLICITADO",
        texto: `Solicitado preenchimento de lance no item ${itemNumero}`,
        valor,
        severidade: "info",
      });
    },
    [appendFeed, disputaId],
  );

  const limparFeed = useCallback(() => setFeed([]), []);

  const itens = useMemo(
    () => Object.values(itensByNum).sort((a, b) => a.itemNumero - b.itemNumero),
    [itensByNum],
  );

  return {
    itens,
    feed,
    statusConexao,
    statusExtensao,
    statusDisputa,
    darLance,
    limparFeed,
    ultimoLanceConfirmadoId,
  };
}
