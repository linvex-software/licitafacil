"use client";

import { useState } from "react";

interface HealthResponse {
  status: string;
  service: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export function HealthCheck() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [data, setData] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = async () => {
    setStatus("loading");
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/health`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const json = await response.json();
      setData(json);
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      setStatus("error");
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={checkHealth}
        disabled={status === "loading"}
        className="w-full rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition-opacity duration-200 hover:opacity-90 disabled:opacity-50 dark:hover:bg-[#e0e0e0]"
      >
        {status === "loading" ? "Verificando..." : "Verificar Status da API"}
      </button>

      {status === "success" && data && (
        <div className="rounded-lg border border-border bg-muted p-4">
          <p className="mb-2 font-semibold text-foreground">
            ✅ API está funcionando!
          </p>
          <div className="text-sm text-muted-foreground">
            <p><strong>Status:</strong> {data.status}</p>
            <p><strong>Service:</strong> {data.service}</p>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="rounded-lg border border-destructive/25 bg-destructive/10 p-4">
          <p className="mb-2 font-semibold text-destructive">
            ❌ Erro ao conectar com a API
          </p>
          <p className="text-sm text-foreground/90">
            {error}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Certifique-se de que a API está disponível em {API_BASE_URL}
          </p>
        </div>
      )}
    </div>
  );
}

