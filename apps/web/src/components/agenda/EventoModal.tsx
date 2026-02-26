"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { EventoAgenda } from "@/lib/api";

interface EventoModalProps {
  aberto: boolean;
  evento: EventoAgenda | null;
  onFechar: () => void;
}

export function EventoModal({ aberto, evento, onFechar }: EventoModalProps) {
  const router = useRouter();

  if (!evento) return null;

  const badgeDias = evento.diasRestantes <= 3 ? "destructive" : evento.diasRestantes <= 7 ? "warning" : "default";

  return (
    <Dialog open={aberto} onOpenChange={(open) => !open && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{evento.titulo}</DialogTitle>
          <DialogDescription>Detalhes do prazo da licitacao.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Tipo</span>
            <Badge variant="secondary">Prazo</Badge>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Data</span>
            <span>{format(new Date(evento.data), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Orgao</span>
            <span className="text-right">{evento.bid.orgao}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Numero</span>
            <span className="text-right">{evento.bid.numero}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Dias restantes</span>
            <Badge variant={badgeDias}>
              {evento.diasRestantes >= 0 ? `${evento.diasRestantes} dia(s)` : `Venceu ha ${Math.abs(evento.diasRestantes)} dia(s)`}
            </Badge>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>
            Fechar
          </Button>
          <Button onClick={() => router.push(`/licitacoes/${evento.bidId}`)}>
            Ver licitacao
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
