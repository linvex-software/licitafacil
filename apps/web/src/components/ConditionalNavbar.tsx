"use client";

import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Navbar } from "./Navbar";

/**
 * Componente que mostra a navbar apenas quando não está na página de login
 */
export function ConditionalNavbar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Não mostrar navbar na página de login
  if (pathname === "/login") {
    return null;
  }

  // Aguardar montagem no cliente para evitar problemas de hidratação
  if (!mounted) {
    return null;
  }

  return <Navbar />;
}
