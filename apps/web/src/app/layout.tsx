import type { Metadata } from "next";
import "./globals.css";
import { ConditionalNavbar } from "@/components/ConditionalNavbar";

export const metadata: Metadata = {
  title: "Licitafacil - Gestão de Licitações",
  description: "Sistema profissional de gestão de licitações",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        <ConditionalNavbar />
        {children}
      </body>
    </html>
  );
}

