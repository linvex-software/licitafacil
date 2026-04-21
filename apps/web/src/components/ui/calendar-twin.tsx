"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, X, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { addMonths, format, isSameDay, isToday, startOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

export interface CalendarEvent {
    id: string;
    date: Date;
    title: string;
    color?: "red" | "amber" | "blue"; // legado: mapeado para tons neutros/destrutivos
    data?: unknown;
}

interface CalendarTwinProps {
    events?: CalendarEvent[];
    className?: string;
    yearRange?: [number, number];
    onEventClick?: (event: CalendarEvent) => void;
    currentMonth: Date;
    onMonthChange: (date: Date) => void;
}

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const EVENT_COLOR_MAP = {
    red: "bg-destructive text-destructive-foreground",
    amber: "bg-muted text-foreground",
    blue: "bg-foreground text-background",
};

const EVENT_BADGE_MAP = {
    red: "bg-destructive/10 text-destructive",
    amber: "bg-muted text-muted-foreground",
    blue: "bg-muted text-foreground",
};

export function CalendarTwin({
    events = [],
    className,
    yearRange = [2000, 2035],
    onEventClick,
    currentMonth,
    onMonthChange,
}: CalendarTwinProps) {
    const [view, setView] = React.useState<"month" | "year">("month");
    // Estado para o dialog de "ver todos os eventos do dia"
    const [diaDialog, setDiaDialog] = React.useState<{ date: Date; events: CalendarEvent[] } | null>(null);

    const goPrev = () => {
        if (view === "month") onMonthChange(addMonths(currentMonth, -1));
        if (view === "year") {
            const prev = new Date(currentMonth);
            prev.setFullYear(prev.getFullYear() - 12);
            onMonthChange(prev);
        }
    };

    const goNext = () => {
        if (view === "month") onMonthChange(addMonths(currentMonth, 1));
        if (view === "year") {
            const next = new Date(currentMonth);
            next.setFullYear(next.getFullYear() + 12);
            onMonthChange(next);
        }
    };

    function getEventsForDay(day: Date): CalendarEvent[] {
        return events.filter((e) => isSameDay(e.date, day));
    }

    const renderMonth = (month: Date) => {
        const start = new Date(month.getFullYear(), month.getMonth(), 1);
        const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
        const days: Date[] = [];
        for (let i = 1; i <= end.getDate(); i++) {
            days.push(new Date(month.getFullYear(), month.getMonth(), i));
        }
        const startDayOfWeek = start.getDay();

        return (
            <div className="w-full">
                <div className="mb-3 text-center text-sm font-semibold text-slate-700 dark:text-slate-300 capitalize">
                    {format(month, "MMMM yyyy", { locale: ptBR })}
                </div>
                <div className="grid grid-cols-7 mb-1">
                    {DIAS_SEMANA.map((d) => (
                        <div
                            key={d}
                            className="h-8 flex items-center justify-center text-xs font-medium text-slate-400 dark:text-slate-500"
                        >
                            {d}
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-y-1">
                    {Array.from({ length: startDayOfWeek }).map((_, i) => (
                        <div key={`empty-${i}`} className="h-14" />
                    ))}
                    {days.map((day) => {
                        const dayEvents = getEventsForDay(day);
                        const isHoje = isToday(day);
                        const extras = dayEvents.length - 2;

                        return (
                            <div
                                key={day.toISOString()}
                                className={cn(
                                    "h-14 flex flex-col items-start px-1 py-0.5 rounded-lg transition-colors border",
                                    isHoje
                                        ? "border-border bg-accent"
                                        : "border-transparent hover:bg-accent/50",
                                )}
                            >
                                <span
                                    className={cn(
                                        "text-xs font-medium self-end mb-0.5",
                                        isHoje
                                            ? "font-bold text-foreground"
                                            : "text-muted-foreground"
                                    )}
                                >
                                    {day.getDate()}
                                </span>
                                <div className="flex flex-col gap-0.5 overflow-hidden w-full">
                                    {dayEvents.slice(0, 2).map((ev) => (
                                        <button
                                            key={ev.id}
                                            onClick={() => onEventClick?.(ev)}
                                            className={cn(
                                                "w-full text-left text-[10px] px-1 py-0.5 rounded truncate font-medium leading-tight transition-opacity hover:opacity-80",
                                                ev.color ? EVENT_COLOR_MAP[ev.color] : EVENT_COLOR_MAP.blue
                                            )}
                                            title={ev.title}
                                        >
                                            {ev.title}
                                        </button>
                                    ))}
                                    {extras > 0 && (
                                        <button
                                            onClick={() => setDiaDialog({ date: day, events: dayEvents })}
                                            className="pl-1 text-left text-[10px] font-medium text-muted-foreground hover:text-foreground hover:underline"
                                        >
                                            +{extras} mais
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderYearGrid = () => {
        const currentYear = currentMonth.getFullYear();
        const startYear = Math.max(
            yearRange[0],
            currentYear - (currentYear % 12)
        );
        const years = Array.from({ length: 12 }, (_, i) => startYear + i);

        return (
            <div className="p-2">
                <div className="grid grid-cols-3 gap-2">
                    {years.map((y) => (
                        <button
                            key={y}
                            onClick={() => {
                                const newDate = startOfYear(currentMonth);
                                newDate.setFullYear(y);
                                onMonthChange(newDate);
                                setView("month");
                            }}
                            className={cn(
                                "h-10 rounded-lg text-sm font-medium transition-colors",
                                y === currentYear
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                            )}
                        >
                            {y}
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <>
            <div
                className={cn(
                    "rounded-xl border border-border bg-card shadow-sm",
                    className
                )}
            >
                {/* Header de navegação — apenas setas */}
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <Button variant="ghost" size="icon" onClick={goPrev} className="h-8 w-8 text-muted-foreground">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <button
                        onClick={() => setView(view === "month" ? "year" : "month")}
                        className="text-sm font-semibold capitalize text-foreground transition-colors hover:text-muted-foreground"
                    >
                        {view === "year" ? `${currentMonth.getFullYear()}` : null}
                    </button>

                    <Button variant="ghost" size="icon" onClick={goNext} className="h-8 w-8 text-muted-foreground">
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>

                {/* Legenda de cores */}
                {view === "month" && (
                    <div className="flex items-center gap-4 border-b border-border px-4 py-2">
                        <div className="flex items-center gap-1.5">
                            <span className="inline-block h-2.5 w-2.5 rounded-full bg-destructive" />
                            <span className="text-xs text-muted-foreground">Urgente (≤3d)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="inline-block h-2.5 w-2.5 rounded-full bg-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Atenção (≤7d)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="inline-block h-2.5 w-2.5 rounded-full bg-foreground" />
                            <span className="text-xs text-muted-foreground">Normal</span>
                        </div>
                    </div>
                )}

                {/* Conteúdo */}
                <div className="p-4">
                    {view === "month" ? (
                        <div className="flex gap-8">
                            <div className="flex-1">{renderMonth(currentMonth)}</div>
                            <div className="hidden h-auto w-px bg-border md:block" />
                            <div className="hidden md:block flex-1">{renderMonth(addMonths(currentMonth, 1))}</div>
                        </div>
                    ) : (
                        renderYearGrid()
                    )}
                </div>
            </div>

            {/* Dialog: todos os eventos de um dia */}
            <Dialog open={!!diaDialog} onOpenChange={(open) => !open && setDiaDialog(null)}>
                {diaDialog && (
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 capitalize">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                {format(diaDialog.date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                            </DialogTitle>
                        </DialogHeader>

                        <p className="-mt-2 text-xs text-muted-foreground">
                            {diaDialog.events.length} prazo{diaDialog.events.length !== 1 ? "s" : ""} neste dia
                        </p>

                        <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
                            {diaDialog.events.map((ev) => (
                                <button
                                    key={ev.id}
                                    onClick={() => {
                                        setDiaDialog(null);
                                        onEventClick?.(ev);
                                    }}
                                    className={cn(
                                        "w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium border transition-all hover:scale-[1.01] hover:shadow-sm",
                                        ev.color
                                            ? EVENT_BADGE_MAP[ev.color]
                                            : EVENT_BADGE_MAP.blue,
                                        "border-transparent"
                                    )}
                                >
                                    <div className="truncate">{ev.title}</div>
                                    <div className="text-[11px] opacity-70 mt-0.5">
                                        {format(ev.date, "HH:mm", { locale: ptBR })}
                                        {ev.color === "red" && " · Urgente"}
                                        {ev.color === "amber" && " · Atenção"}
                                    </div>
                                </button>
                            ))}
                        </div>

                        <div className="flex justify-end pt-1">
                            <Button variant="outline" size="sm" onClick={() => setDiaDialog(null)}>
                                <X className="w-3.5 h-3.5 mr-1" />
                                Fechar
                            </Button>
                        </div>
                    </DialogContent>
                )}
            </Dialog>
        </>
    );
}
