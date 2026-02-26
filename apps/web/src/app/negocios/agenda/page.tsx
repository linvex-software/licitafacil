"use client";

import "./agenda.css";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useEffect, useMemo, useState } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, getDay, parse, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Layout } from "@/components/layout";
import { LicitacaoModal } from "@/components/licitacoes/licitacao-modal";
import { Button } from "@/components/ui/button";
import { getEventosAgenda, type EventoAgenda } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { locale: ptBR }),
  getDay,
  locales: { "pt-BR": ptBR },
});

const messages = {
  today: "Hoje",
  previous: "Anterior",
  next: "Proximo",
  month: "Mes",
  week: "Semana",
  day: "Dia",
  agenda: "Agenda",
  date: "Data",
  time: "Hora",
  event: "Evento",
  noEventsInRange: "Nenhum evento neste periodo.",
  showMore: (total: number) => `+${total} mais`,
};

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: EventoAgenda;
}

export default function AgendaPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [mesAtual, setMesAtual] = useState(new Date());
  const [eventos, setEventos] = useState<EventoAgenda[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalBidId, setModalBidId] = useState<string | null>(null);
  const [mensagemVazia, setMensagemVazia] = useState("Nenhum evento neste mes");

  useEffect(() => {
    carregarEventosMes();
  }, [mesAtual]);

  async function carregarEventosMes() {
    setLoading(true);
    try {
      const mes = format(mesAtual, "yyyy-MM");
      const response = await getEventosAgenda(mes);
      setEventos(response.eventos ?? []);
      setMensagemVazia(response.message ?? "Nenhum evento neste mes");
    } catch (_error) {
      setEventos([]);
      setMensagemVazia("Nenhum evento neste mes");
      toast({
        title: "Nao foi possivel carregar a agenda",
        description: "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  const eventosFormatados = useMemo<CalendarEvent[]>(
    () =>
      eventos.map((evento) => ({
        id: evento.id,
        title: evento.titulo,
        start: new Date(evento.data),
        end: new Date(evento.data),
        resource: evento,
      })),
    [eventos],
  );

  function getCorEvento(evento: CalendarEvent) {
    const dias = evento.resource?.diasRestantes ?? 999;
    if (dias <= 3) return { style: { backgroundColor: "#ef4444", borderColor: "#dc2626" } };
    if (dias <= 7) return { style: { backgroundColor: "#f59e0b", borderColor: "#d97706" } };
    return { style: { backgroundColor: "#3b82f6", borderColor: "#2563eb" } };
  }

  const irParaHoje = () => setMesAtual(new Date());
  const mesAnterior = () =>
    setMesAtual((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  const proximoMes = () =>
    setMesAtual((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });

  return (
    <Layout fullWidth>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <CalendarDays className="w-6 h-6 text-blue-600" />
            Agenda
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Prazos e eventos das suas licitacoes
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={mesAnterior}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Mes Anterior
            </Button>
            <Button type="button" variant="outline" onClick={irParaHoje}>
              Hoje
            </Button>
            <Button type="button" variant="outline" onClick={proximoMes}>
              Proximo Mes
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 capitalize">
            {format(mesAtual, "MMMM yyyy", { locale: ptBR })}
          </h2>
        </div>

        {loading ? (
          <div className="h-[500px] max-h-[70vh] rounded-lg border bg-white dark:bg-gray-900 p-4">
            <div className="grid grid-cols-7 gap-2 mb-3">
              {Array.from({ length: 7 }).map((_, index) => (
                <div key={index} className="h-6 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 35 }).map((_, index) => (
                <div key={index} className="h-20 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border bg-white dark:bg-gray-900 p-3">
            {eventos.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                {mensagemVazia || "Nenhum evento neste mes"}
              </p>
            )}
            <div className="h-[500px] max-h-[70vh]">
              <Calendar
                localizer={localizer}
                events={eventosFormatados}
                date={mesAtual}
                onNavigate={(date) => setMesAtual(date)}
                view="month"
                onView={() => {}}
                startAccessor="start"
                endAccessor="end"
                style={{ height: "100%" }}
                culture="pt-BR"
                messages={messages}
                toolbar={false}
                onSelectEvent={(evento) => {
                  setModalBidId((evento as CalendarEvent).resource.bidId);
                }}
                eventPropGetter={(evento) => getCorEvento(evento as CalendarEvent)}
              />
            </div>
          </div>
        )}
      </div>

      <LicitacaoModal
        bidId={modalBidId}
        onFechar={() => setModalBidId(null)}
        onAbrirPaginaCompleta={(id) => router.push(`/licitacoes/${id}`)}
      />
    </Layout>
  );
}
