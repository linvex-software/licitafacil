import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { VlibrasWidget } from "./vlibras-widget";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://licitacao.limvex.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "LVX Licitação",
  description: "Gestão inteligente de processos licitatórios",
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: siteUrl,
    siteName: "Limvex Licitação",
    title: "LVX Licitação",
    description: "Gestão inteligente de processos licitatórios",
  },
  twitter: {
    card: "summary_large_image",
    title: "LVX Licitação",
    description: "Gestão inteligente de processos licitatórios",
  },
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
        <VlibrasWidget />
      </body>
    </html>
  );
}

