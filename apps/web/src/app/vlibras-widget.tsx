"use client";

import { usePathname } from "next/navigation";

export function VlibrasWidget() {
  const pathname = usePathname();

  if (pathname?.startsWith("/checkout")) {
    return null;
  }

  return (
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
              if (window.VLibras) {
                new window.VLibras.Widget('https://vlibras.gov.br/app');
              }
            });
          </script>
        `,
      }}
    />
  );
}
