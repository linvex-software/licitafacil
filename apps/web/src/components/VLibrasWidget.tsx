"use client";

import Script from "next/script";

export function VLibrasWidget() {
  return (
    <>
      <div vw="true" className="enabled">
        <div vw-access-button="true" className="active"></div>
        <div vw-plugin-wrapper="true">
          <div className="vw-plugin-top-wrapper"></div>
        </div>
      </div>
      <Script
        src="https://vlibras.gov.br/app/vlibras-plugin.js"
        strategy="afterInteractive"
        onLoad={() => {
          // @ts-expect-error VLibras is loaded via external script
          new window.VLibras.Widget("https://vlibras.gov.br/app");
        }}
      />
    </>
  );
}
