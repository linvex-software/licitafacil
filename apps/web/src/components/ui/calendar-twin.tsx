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
    color?: "red" | "amber" | "blue";
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
    red: "bg-red-500 text-white",
    amber: "bg-amber-400 text-white",
    blue: "bg-blue-500 text-white",
};

const EVENT_BADGE_MAP = {
    red: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
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
                                        ? "border-blue-400/50 bg-blue-50/80 dark:bg-blue-950/30 dark:border-blue-700/50"
                                        : "border-transparent hover:bg-slate-100/70 dark:hover:bg-slate-800/50",
                                )}
                            >
                                <span
                                    className={cn(
                                        "text-xs font-medium self-end mb-0.5",
                                        isHoje
                                            ? "text-blue-600 dark:text-blue-400 font-bold"
                                            : "text-slate-600 dark:text-slate-400"
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
                                            className="text-[10px] text-blue-500 dark:text-blue-400 pl-1 text-left hover:underline font-medium"
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
                                    ? "bg-blue-500 text-white"
                                    : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
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
                    "rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm",
                    className
                )}
            >
                {/* Header de navegação — apenas setas */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                    <Button variant="ghost" size="icon" onClick={goPrev} className="h-8 w-8 text-slate-500">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <button
                        onClick={() => setView(view === "month" ? "year" : "month")}
                        className="text-sm font-semibold text-slate-800 dark:text-slate-100 capitalize hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                        {view === "year" ? `${currentMonth.getFullYear()}` : null}
                    </button>

                    <Button variant="ghost" size="icon" onClick={goNext} className="h-8 w-8 text-slate-500">
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>

                {/* Legenda de cores */}
                {view === "month" && (
                    <div className="flex items-center gap-4 px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                            <span className="text-xs text-slate-500 dark:text-slate-400">Urgente (≤3d)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                            <span className="text-xs text-slate-500 dark:text-slate-400">Atenção (≤7d)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                            <span className="text-xs text-slate-500 dark:text-slate-400">Normal</span>
                        </div>
                    </div>
                )}

                {/* Conteúdo */}
                <div className="p-4">
                    {view === "month" ? (
                        <div className="flex gap-8">
                            <div className="flex-1">{renderMonth(currentMonth)}</div>
                            <div className="hidden md:block w-px bg-slate-100 dark:bg-slate-800" />
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
                                <Clock className="w-4 h-4 text-blue-500" />
                                {format(diaDialog.date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                            </DialogTitle>
                        </DialogHeader>

                        <p className="text-xs text-slate-500 dark:text-slate-400 -mt-2">
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
