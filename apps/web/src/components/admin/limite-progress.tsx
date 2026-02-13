"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

interface LimiteProgressProps {
  titulo: string;
  atual: number;
  limite: number;
  percentual: number;
  unidade?: string;
}

export function LimiteProgress({
  titulo,
  atual,
  limite,
  unidade = "",
}: LimiteProgressProps) {
  const ilimitado = limite >= 999999;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{titulo}</CardTitle>
          <span className="text-sm text-muted-foreground">
            {unidade === "GB" ? atual.toFixed(2) : atual}
            {ilimitado ? " (ilimitado)" : ` / ${limite} ${unidade}`}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">
          {ilimitado ? "Plano sem restrições" : `Uso atual: ${atual}`}
        </p>
      </CardContent>
    </Card>
  );
}
