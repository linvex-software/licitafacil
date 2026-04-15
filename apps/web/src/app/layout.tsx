import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { VlibrasWidget } from "./vlibras-widget";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://licitacao.limvex.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "Limvex Licitação",
  title: {
    default: "Limvex Licitação",
    template: "%s · Limvex Licitação",
  },
  description: "Gestão inteligente de processos licitatórios",
  icons: {
    icon: [{ url: "/brand/logoBrancaBgPreto.png", type: "image/png" }],
    shortcut: "/brand/logoBrancaBgPreto.png",
    apple: "/brand/logoBrancaBgPreto.png",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: siteUrl,
    siteName: "Limvex Licitação",
    title: "Limvex Licitação",
    description: "Gestão inteligente de processos licitatórios",
  },
  twitter: {
    card: "summary_large_image",
    title: "Limvex Licitação",
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

