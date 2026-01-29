"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { io } from "socket.io-client";
import { getToken } from "@/lib/auth";
import { fetchAlerts, markAlertSeen } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { Alert } from "@licitafacil/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unseenCount, setUnseenCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const { toast } = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const loadAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchAlerts({ limit: 30 });
      const list = res?.data ?? [];
      setAlerts(list);
      const unseen = list.filter((a: Alert) => a.status === "UNSEEN").length;
      setUnseenCount(unseen);
    } catch {
      setAlerts([]);
      setUnseenCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const sock = io(`${API_URL}/alerts-ws`, {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    sock.on("connect", () => {
      setConnected(true);
      loadAlerts();
    });

    sock.on("disconnect", () => {
      setConnected(false);
    });

    sock.on("alert", (alert: Alert) => {
      setAlerts((prev) => [alert, ...prev]);
      setUnseenCount((prev) => prev + 1);
      const severity = alert.severity ?? "INFO";
      toastRef.current({
        title: alert.title,
        description: alert.message,
        variant: severity === "CRITICAL" ? "destructive" : "default",
      });
    });

    sock.on("connect_error", () => {
      setConnected(false);
    });

    return () => {
      sock.removeAllListeners();
      sock.disconnect();
      setConnected(false);
    };
  }, [loadAlerts]);

  const markSeen = useCallback(
    async (id: string) => {
      try {
        await markAlertSeen(id);
        setAlerts((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: "SEEN" as const } : a))
        );
        setUnseenCount((prev) => Math.max(0, prev - 1));
      } catch {
        // ignore
      }
    },
    []
  );

  return {
    alerts,
    unseenCount,
    loading,
    refetch: loadAlerts,
    markSeen,
    connected,
  };
}
