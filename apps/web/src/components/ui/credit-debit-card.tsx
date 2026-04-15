import * as React from "react";
import { cn } from "@/lib/utils";

interface FlippableCreditCardProps extends React.HTMLAttributes<HTMLDivElement> {
  cardholderName: string;
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  flipped?: boolean;
}

const FlippableCreditCard = React.forwardRef<HTMLDivElement, FlippableCreditCardProps>(
  ({ className, cardholderName, cardNumber, expiryDate, cvv, flipped = false, ...props }, ref) => {
    return (
      <div className={cn("mx-auto h-44 w-72 [perspective:1000px]", className)} ref={ref} {...props}>
        <div
          className={cn(
            "relative h-full w-full rounded-xl shadow-xl transition-transform duration-700 [transform-style:preserve-3d]",
            flipped && "[transform:rotateY(180deg)]",
          )}
        >
          <div className="absolute h-full w-full rounded-xl border border-[#333333] bg-[#111111] text-white [backface-visibility:hidden]">
            <div className="relative flex h-full flex-col justify-between p-5">
              <div className="flex items-start justify-between">
                <div className="h-8 w-10 rounded bg-amber-500/80" />
                <p className="text-xs font-bold tracking-widest text-[#999]">CREDIT</p>
              </div>
              <div className="text-center font-mono text-lg tracking-wider">
                {cardNumber || "•••• •••• •••• ••••"}
              </div>
              <div className="flex items-end justify-between">
                <div className="text-left">
                  <p className="text-[10px] uppercase text-[#666]">Titular</p>
                  <p className="font-mono text-xs">{cardholderName || "NOME DO TITULAR"}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase text-[#666]">Validade</p>
                  <p className="font-mono text-xs">{expiryDate || "MM/AA"}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute h-full w-full rounded-xl border border-[#333333] bg-[#111111] text-white [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <div className="flex h-full flex-col">
              <div className="mt-6 h-10 w-full bg-[#333]" />
              <div className="mx-4 mt-4 flex justify-end">
                <div className="flex h-8 w-full items-center justify-end rounded bg-[#1a1a1a] pr-4">
                  <p className="font-mono text-sm">{cvv || "•••"}</p>
                </div>
              </div>
              <p className="mt-1 self-end pr-4 text-[10px] uppercase text-[#666]">CVV</p>
            </div>
          </div>
        </div>
      </div>
    );
  },
);
FlippableCreditCard.displayName = "FlippableCreditCard";

export { FlippableCreditCard };
