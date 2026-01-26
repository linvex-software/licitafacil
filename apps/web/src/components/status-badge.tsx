import { Badge } from "@/components/ui/Badge";
import { CheckCircle2, AlertTriangle, Clock, ShieldCheck, XCircle } from "lucide-react";

const statusConfig: Record<string, { label: string; className: string; icon: any }> = {
    OK: {
        label: "Operacional",
        className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]",
        icon: ShieldCheck
    },
    EM_RISCO: {
        label: "Crítico",
        className: "bg-red-500/10 text-red-600 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]",
        icon: AlertTriangle
    },
    aberta: {
        label: "Ativa",
        className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
        icon: CheckCircle2
    },
    vencida: {
        label: "Prazo Crítico",
        className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
        icon: Clock
    },
    cancelada: {
        label: "Cancelada",
        className: "bg-slate-500/10 text-slate-600 border-slate-500/20",
        icon: XCircle
    }
};

export function StatusBadge({ status }: { status: string }) {
    const config = statusConfig[status] || {
        label: status,
        className: "bg-slate-100 text-slate-600 border-slate-200",
        icon: Clock
    };

    const Icon = config.icon;

    return (
        <Badge variant="outline" className={`${config.className} font-bold px-2 py-0.5 rounded-lg border flex items-center gap-1.5 w-fit transition-all hover:scale-105 cursor-default`}>
            <Icon className="w-3 h-3" />
            <span className="text-[10px] uppercase tracking-wider">{config.label}</span>
        </Badge>
    );
}
