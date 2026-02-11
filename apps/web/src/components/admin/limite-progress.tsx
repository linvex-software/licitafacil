"use client";

import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

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
  percentual,
  unidade = "",
}: LimiteProgressProps) {
  const corClasse =
    percentual >= 90
      ? "[&>div]:bg-red-500"
      : percentual >= 80
        ? "[&>div]:bg-yellow-500"
        : "[&>div]:bg-green-500";

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{titulo}</CardTitle>
          <span className="text-sm text-muted-foreground">
            {unidade === "GB" ? atual.toFixed(2) : atual} / {limite} {unidade}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <Progress
          value={Math.min(percentual, 100)}
          className={cn("h-3", corClasse)}
        />
        <p className="text-xs text-muted-foreground mt-2">
          {percentual.toFixed(1)}% utilizado
        </p>
        {percentual >= 90 && (
          <p className="text-xs text-red-600 font-medium mt-1">
            Limite quase atingido! Considere fazer upgrade.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
