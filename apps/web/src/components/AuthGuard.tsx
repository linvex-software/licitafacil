"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * Componente que protege rotas, redirecionando para login se não autenticado.
 * Usa estado `mounted` para evitar hydration mismatch (localStorage só existe no client).
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated()) {
      router.push("/login");
    }
  }, [router]);

  // Antes de montar no client, renderizar placeholder neutro (evita hydration mismatch)
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Carregando...</div>
      </div>
    );
  }

  if (!isAuthenticated()) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Redirecionando para login...</div>
      </div>
    );
  }

  return <>{children}</>;
}
