"use client";

import { useEffect, useMemo, useState } from "react";
import { format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Layout } from "@/components/layout";
import { LicitacaoModal } from "@/components/licitacoes/licitacao-modal";
import { Button } from "@/components/ui/button";
import { getEventosAgenda, type EventoAgenda } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { CalendarTwin, type CalendarEvent } from "@/components/ui/calendar-twin";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/Badge";

export default function AgendaPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [mesAtual, setMesAtual] = useState(new Date());
  const [eventos, setEventos] = useState<EventoAgenda[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalBidId, setModalBidId] = useState<string | null>(null);
  const [eventoSelecionado, setEventoSelecionado] = useState<EventoAgenda | null>(null);

  // Carrega mês atual + próximo para exibir os dois side-by-side
  useEffect(() => {
    carregarEventos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesAtual]);

  async function carregarEventos() {
    setLoading(true);
    try {
      const mes1 = format(mesAtual, "yyyy-MM");
      const mes2 = format(addMonths(mesAtual, 1), "yyyy-MM");

      const [r1, r2] = await Promise.all([
        getEventosAgenda(mes1),
        getEventosAgenda(mes2),
      ]);

      const todos = [...(r1.eventos ?? []), ...(r2.eventos ?? [])];
      // Deduplica por id
      const unicos = todos.filter(
        (ev, idx, arr) => arr.findIndex((e) => e.id === ev.id) === idx
      );
      setEventos(unicos);
    } catch (_error) {
      setEventos([]);
      toast({
        title: "Não foi possível carregar a agenda",
        description: "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  const calendarEvents = useMemo<CalendarEvent[]>(
    () =>
      eventos.map((ev) => {
        const dias = ev.diasRestantes ?? 999;
        const color: CalendarEvent["color"] =
          dias <= 3 ? "red" : dias <= 7 ? "amber" : "blue";
        return {
          id: ev.id,
          date: new Date(ev.data),
          title: ev.titulo,
          color,
          data: ev,
        };
      }),
    [eventos]
  );

  function handleEventClick(ev: CalendarEvent) {
    setEventoSelecionado(ev.data as EventoAgenda);
  }

  return (
    <Layout fullWidth>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100">
              <CalendarDays className="w-6 h-6 text-blue-600" />
              Agenda
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Prazos e eventos das suas licitações
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMesAtual(addMonths(mesAtual, -1))}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMesAtual(new Date())}
            >
              Hoje
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMesAtual(addMonths(mesAtual, 1))}
            >
              Próximo
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>

        {/* Calendário */}
        {loading ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-6">
            <div className="mb-3 flex justify-between">
              <div className="h-5 w-32 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
              <div className="h-5 w-32 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
            </div>
            <div className="grid grid-cols-7 gap-2 mb-3">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-6 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="h-14 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
              ))}
            </div>
          </div>
        ) : (
          <CalendarTwin
            events={calendarEvents}
            currentMonth={mesAtual}
            onMonthChange={setMesAtual}
            onEventClick={handleEventClick}
            className="w-full"
          />
        )}


      </div>

      {/* Modal de evento */}
      <Dialog
        open={!!eventoSelecionado}
        onOpenChange={(open) => !open && setEventoSelecionado(null)}
      >
        {eventoSelecionado && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{eventoSelecionado.titulo}</DialogTitle>
              <DialogDescription>
                Detalhes do prazo da licitação
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Data</span>
                <span>
                  {format(
                    new Date(eventoSelecionado.data),
                    "dd/MM/yyyy 'às' HH:mm",
                    { locale: ptBR }
                  )}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Órgão</span>
                <span className="text-right">{eventoSelecionado.bid?.orgao}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Número</span>
                <span className="text-right">{eventoSelecionado.bid?.numero}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Dias restantes</span>
                <Badge
                  variant={
                    eventoSelecionado.diasRestantes <= 3
                      ? "destructive"
                      : eventoSelecionado.diasRestantes <= 7
                        ? "secondary"
                        : "default"
                  }
                >
                  {eventoSelecionado.diasRestantes >= 0
                    ? `${eventoSelecionado.diasRestantes} dia(s)`
                    : `Venceu há ${Math.abs(eventoSelecionado.diasRestantes)} dia(s)`}
                </Badge>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEventoSelecionado(null)}>
                Fechar
              </Button>
              <Button
                onClick={() => {
                  setEventoSelecionado(null);
                  setModalBidId(eventoSelecionado.bidId);
                }}
              >
                Ver licitação
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      <LicitacaoModal
        bidId={modalBidId}
        onFechar={() => setModalBidId(null)}
        onAbrirPaginaCompleta={(id) => router.push(`/licitacoes/${id}`)}
      />
    </Layout>
  );
}
