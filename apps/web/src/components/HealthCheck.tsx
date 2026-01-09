"use client";

import { useState } from "react";

interface HealthResponse {
  status: string;
  service: string;
}

export function HealthCheck() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [data, setData] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = async () => {
    setStatus("loading");
    setError(null);

    try {
      const response = await fetch("http://localhost:3001/health");

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
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
      >
        {status === "loading" ? "Verificando..." : "Verificar Status da API"}
      </button>

      {status === "success" && data && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-green-800 dark:text-green-300 font-semibold mb-2">
            ✅ API está funcionando!
          </p>
          <div className="text-sm text-green-700 dark:text-green-400">
            <p><strong>Status:</strong> {data.status}</p>
            <p><strong>Service:</strong> {data.service}</p>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-300 font-semibold mb-2">
            ❌ Erro ao conectar com a API
          </p>
          <p className="text-sm text-red-700 dark:text-red-400">
            {error}
          </p>
          <p className="text-xs text-red-600 dark:text-red-500 mt-2">
            Certifique-se de que a API está rodando em http://localhost:3001
          </p>
        </div>
      )}
    </div>
  );
}

