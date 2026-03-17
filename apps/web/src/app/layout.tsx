import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { VLibrasWidget } from "@/components/VLibrasWidget";

export const metadata: Metadata = {
  title: "Licitafacil - Gestão de Licitações",
  description: "Sistema profissional de gestão de licitações",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased font-sans" suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
        {/* VLibras - Widget oficial de acessibilidade do Governo Federal */}
        <VLibrasWidget />
      </body>
    </html>
  );
}

