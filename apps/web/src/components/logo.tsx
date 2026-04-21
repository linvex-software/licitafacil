import Image from "next/image";
import { cn } from "@/lib/utils";

const BRAND = "LIMVEX LICITAÇÃO";

/**
 * Área do ícone com tamanho fixo; no dark a arte usa scale dentro do clip (zoom real, sem “esticar” a caixa).
 */
export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const box = { sm: 34, md: 42, lg: 52 }[size];
  const textSizes = {
    sm: "text-xs",
    md: "text-base sm:text-[17px]",
    lg: "text-lg sm:text-xl",
  };

  return (
    <div className="flex items-center gap-2.5">
      <div
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-white p-0.5 dark:border-[#444444] dark:bg-[#0a0a0a] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]",
        )}
        style={{ width: box, height: box }}
      >
        <div className="flex h-full w-full items-center justify-center dark:hidden">
          <Image
            src="/brand/LogoPretaBgBranco.png"
            alt=""
            width={120}
            height={120}
            className="max-h-[90%] max-w-[90%] object-contain"
            priority
          />
        </div>
        <div className="hidden h-full w-full items-center justify-center overflow-hidden dark:flex">
          <Image
            src="/brand/logoBrancaBgPreto.png"
            alt=""
            width={120}
            height={120}
            className="max-h-[85%] max-w-[85%] origin-center scale-[1.62] object-contain will-change-transform"
          />
        </div>
      </div>
      <span
        className={cn(
          "whitespace-nowrap font-limvex font-semibold uppercase tracking-tight text-foreground",
          textSizes[size],
        )}
      >
        {BRAND}
      </span>
    </div>
  );
}
