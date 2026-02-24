import { cn } from "@/lib/utils";
import {
    CheckCircle2, AlertTriangle, Clock, ShieldCheck,
    XCircle, PlayCircle, Eye, Trophy, Archive
} from "lucide-react";

interface StatusConfig {
    label: string;
    className: string;
    icon: any;
}

const statusConfig: Record<string, StatusConfig> = {
    OK: { label: "Operacional", className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400", icon: ShieldCheck },
    EM_RISCO: { label: "Em Risco", className: "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400", icon: AlertTriangle },
    aberta: { label: "Ativa", className: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400", icon: CheckCircle2 },
    vencida: { label: "Crítico", className: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400", icon: Clock },
    cancelada: { label: "Cancelada", className: "border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400", icon: XCircle },
    ANALISANDO: { label: "Analisando", className: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400", icon: Eye },
    PARTICIPANDO: { label: "Participando", className: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-400", icon: PlayCircle },
    VENCIDA: { label: "Venceu", className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400", icon: Trophy },
    PERDIDA: { label: "Perdeu", className: "border-red-200 bg-red-50 text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400", icon: XCircle },
    DESCARTADA: { label: "Descartada", className: "border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500", icon: Archive },
};

export function StatusBadge({ status }: { status: string }) {
    const config = statusConfig[status] || {
        label: status,
        className: "border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400",
        icon: Clock,
    };
    const Icon = config.icon;

    return (
        <span className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold w-fit",
            config.className
        )}>
            <Icon className="w-3 h-3 shrink-0" />
            {config.label}
        </span>
    );
}
