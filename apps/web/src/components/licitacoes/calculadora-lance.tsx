"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator } from "lucide-react";

interface CalculadoraLanceProps {
  valorReferencia?: number | null;
}

// ─── Formatação de saída ──────────────────────────────────────────────────────

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(value);
}

// ─── Máscara monetária ────────────────────────────────────────────────────────
// Armazena centavos (inteiro) e exibe como "R$ 1.234,56".
// Digitar "1", "12", "123" → centavos 1, 12, 123 → "R$ 0,01", "R$ 0,12", "R$ 1,23".

function centavosParaDisplay(centavos: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(centavos / 100);
}

function reaisParaCentavos(reais: number): number {
  return Math.round(reais * 100);
}

// ─── Tipos internos ───────────────────────────────────────────────────────────

interface LanceCardProps {
  label: string;
  value: number;
  desconto: number;
  borderColor: string;
  bgColor: string;
  labelColor: string;
  valueColor: string;
  subColor: string;
}

function LanceCard({
  label,
  value,
  desconto,
  borderColor,
  bgColor,
  labelColor,
  valueColor,
  subColor,
}: LanceCardProps) {
  return (
    <div className={`rounded-xl border p-4 ${borderColor} ${bgColor}`}>
      <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${labelColor}`}>
        {label}
      </p>
      <p className={`text-lg font-bold font-mono ${valueColor}`}>
        {formatBRL(value)}
      </p>
      <p className={`text-xs mt-1 ${subColor}`}>
        -{desconto.toFixed(2)}% do valor de referência
      </p>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function CalculadoraLance({ valorReferencia }: CalculadoraLanceProps) {
  // null = campo vazio; número inteiro = centavos
  const [centavos, setCentavos] = useState<number | null>(() => {
    if (!valorReferencia || valorReferencia <= 0) return null;
    return reaisParaCentavos(valorReferencia);
  });

  const [descontoStr, setDescontoStr] = useState("");

  // Valor em reais derivado dos centavos (para os cálculos)
  const valorReais = centavos !== null ? centavos / 100 : 0;

  // Display do campo monetário
  const valorDisplay = centavos !== null ? centavosParaDisplay(centavos) : "";

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, ""); // apenas dígitos
    if (raw === "" || raw === "0") {
      setCentavos(null);
      return;
    }
    const parsed = parseInt(raw, 10);
    // Limite razoável: 999 bilhões de centavos (R$ 9.999.999.999,99)
    if (parsed <= 999_999_999_999) {
      setCentavos(parsed);
    }
  };

  const handleDescontoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    // Aceita dígitos + opcional vírgula/ponto + até 2 casas decimais
    if (v === "" || /^\d{0,3}([.,]\d{0,2})?$/.test(v)) {
      const num = parseFloat(v.replace(",", "."));
      if (v === "" || isNaN(num) || num <= 100) {
        setDescontoStr(v);
      }
    }
  };

  const resultado = useMemo(() => {
    const desconto = parseFloat(descontoStr.replace(",", ".")) || 0;
    if (valorReais <= 0 || desconto <= 0 || desconto > 100) return null;

    const sugerido = valorReais * (1 - (desconto / 100) * 0.7);
    const agressivo = valorReais * (1 - desconto / 100);
    const conservador = valorReais * (1 - (desconto / 100) * 0.4);

    return {
      sugerido,
      agressivo,
      conservador,
      descontoSugerido: (1 - sugerido / valorReais) * 100,
      descontoAgressivo: (1 - agressivo / valorReais) * 100,
      descontoConservador: (1 - conservador / valorReais) * 100,
    };
  }, [valorReais, descontoStr]);

  return (
    <Card className="shadow-sm border-gray-200 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="text-lg font-heading flex items-center gap-2">
          <Calculator className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          Calculadora de Lance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Campo monetário com máscara */}
          <div className="space-y-1.5">
            <Label htmlFor="calc-valor">Valor de Referência</Label>
            <Input
              id="calc-valor"
              inputMode="numeric"
              placeholder="R$ 0,00"
              value={valorDisplay}
              onChange={handleValorChange}
            />
          </div>

          {/* Campo de desconto com sufixo % */}
          <div className="space-y-1.5">
            <Label htmlFor="calc-desconto">Desconto Mínimo Aceitável</Label>
            <div className="relative">
              <Input
                id="calc-desconto"
                inputMode="decimal"
                placeholder="0,00"
                value={descontoStr}
                onChange={handleDescontoChange}
                className="pr-8"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400 dark:text-gray-500">
                %
              </span>
            </div>
          </div>
        </div>

        {resultado ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <LanceCard
              label="Lance Conservador"
              value={resultado.conservador}
              desconto={resultado.descontoConservador}
              borderColor="border-emerald-200 dark:border-emerald-800/40"
              bgColor="bg-emerald-50 dark:bg-emerald-950/30"
              labelColor="text-emerald-700 dark:text-emerald-400"
              valueColor="text-emerald-900 dark:text-emerald-100"
              subColor="text-emerald-600/70 dark:text-emerald-400/70"
            />
            <LanceCard
              label="Lance Sugerido"
              value={resultado.sugerido}
              desconto={resultado.descontoSugerido}
              borderColor="border-blue-200 dark:border-blue-800/40"
              bgColor="bg-blue-50 dark:bg-blue-950/30"
              labelColor="text-blue-700 dark:text-blue-400"
              valueColor="text-blue-900 dark:text-blue-100"
              subColor="text-blue-600/70 dark:text-blue-400/70"
            />
            <LanceCard
              label="Lance Agressivo"
              value={resultado.agressivo}
              desconto={resultado.descontoAgressivo}
              borderColor="border-amber-200 dark:border-amber-800/40"
              bgColor="bg-amber-50 dark:bg-amber-950/30"
              labelColor="text-amber-700 dark:text-amber-400"
              valueColor="text-amber-900 dark:text-amber-100"
              subColor="text-amber-600/70 dark:text-amber-400/70"
            />
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 py-8 text-center">
            <Calculator className="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Preencha os campos acima para calcular os lances instantaneamente.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
