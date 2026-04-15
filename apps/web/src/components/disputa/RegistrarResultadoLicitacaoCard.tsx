"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { listarDisputas, type Disputa } from "@/lib/api";
import { RegistrarResultadoModal } from "@/components/disputa/RegistrarResultadoModal";
import Link from "next/link";

interface RegistrarResultadoLicitacaoCardProps {
  bidId: string;
}

export function RegistrarResultadoLicitacaoCard({ bidId }: RegistrarResultadoLicitacaoCardProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [disputa, setDisputa] = useState<Disputa | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const lista = await listarDisputas({ bidId });
        const encerradas = lista.filter((d) => d.status === "ENCERRADA");
        const maisRecente = encerradas.sort((a, b) => (b.encerradoEm ?? "").localeCompare(a.encerradoEm ?? ""))[0] ?? null;
        setDisputa(maisRecente);
      } catch {
        toast({ title: "Erro ao carregar disputa", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [bidId, toast]);

  const podeRegistrar = useMemo(() => {
    if (!disputa) return false;
    return disputa.status === "ENCERRADA";
  }, [disputa]);

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="text-lg font-heading">Resultado da disputa ao vivo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!disputa ? (
          <p className="text-sm text-slate-600">
            {loading ? "Carregando disputa..." : "Nenhuma disputa encerrada encontrada para esta licitação."}
          </p>
        ) : (
          <>
            <p className="text-sm text-slate-700">
              Disputa: <span className="font-semibold">{disputa.id}</span>
            </p>
            <p className="text-sm text-slate-700">
              Status: <span className="font-semibold">{disputa.status}</span>{" "}
              {disputa.encerradoEm ? (
                <span className="text-slate-500">• Encerrada em {new Date(disputa.encerradoEm).toLocaleString("pt-BR")}</span>
              ) : null}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => setOpen(true)} disabled={!podeRegistrar}>
                Registrar resultado
              </Button>
              <Link href={`/disputa/historico/${disputa.id}`}>
                <Button type="button" variant="outline">
                  Ver histórico
                </Button>
              </Link>
            </div>
          </>
        )}

        {disputa?.id && (
          <RegistrarResultadoModal
            open={open}
            onOpenChange={setOpen}
            disputaId={disputa.id}
            disputa={disputa}
            onSaved={(d) => setDisputa(d)}
          />
        )}
      </CardContent>
    </Card>
  );
}

