import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Oswald } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { VlibrasWidget } from "./vlibras-widget";

const oswald = Oswald({
  subsets: ["latin"],
  variable: "--font-oswald",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

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
    <html lang="pt-BR" suppressHydrationWarning className={oswald.variable}>
      <body className="antialiased font-sans" suppressHydrationWarning>
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function(){try{var t=localStorage.getItem('theme');var r=document.documentElement;if(t==='light'){r.classList.remove('dark')}else if(t==='dark'){r.classList.add('dark')}else{if(window.matchMedia('(prefers-color-scheme: dark)').matches)r.classList.add('dark');else r.classList.remove('dark')}}catch(e){}})();`}
        </Script>
        <Providers>
          {children}
        </Providers>
        <VlibrasWidget />
      </body>
    </html>
  );
}

