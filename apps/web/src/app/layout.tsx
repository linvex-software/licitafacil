import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "LVX Licitação",
  description: "Gestão inteligente de processos licitatórios",
  icons: {
    icon: "/favicon.svg",
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
        {/* VLibras - Widget oficial de acessibilidade do Governo Federal */}
        <div
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
              <div vw class="enabled">
                <div vw-access-button class="active"></div>
                <div vw-plugin-wrapper>
                  <div class="vw-plugin-top-wrapper"></div>
                </div>
              </div>
              <script src="https://vlibras.gov.br/app/vlibras-plugin.js"></script>
              <script>
                document.addEventListener('DOMContentLoaded', function() {
                  new window.VLibras.Widget('https://vlibras.gov.br/app');
                });
              </script>
            `
          }}
        />
      </body>
    </html>
  );
}

