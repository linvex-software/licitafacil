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
    OK: { label: "Operacional", className: "border-border bg-muted text-foreground", icon: ShieldCheck },
    EM_RISCO: { label: "Em Risco", className: "border-destructive/40 bg-destructive/10 text-destructive", icon: AlertTriangle },
    aberta: { label: "Ativa", className: "border-border bg-muted text-foreground", icon: CheckCircle2 },
    vencida: { label: "Crítico", className: "border-border bg-muted text-muted-foreground", icon: Clock },
    cancelada: { label: "Cancelada", className: "border-border bg-muted/60 text-muted-foreground", icon: XCircle },
    ANALISANDO: { label: "Analisando", className: "border-border bg-muted text-foreground", icon: Eye },
    PARTICIPANDO: { label: "Participando", className: "border-border bg-muted text-foreground", icon: PlayCircle },
    VENCIDA: { label: "Venceu", className: "border-border bg-muted text-foreground", icon: Trophy },
    PERDIDA: { label: "Perdeu", className: "border-destructive/40 bg-destructive/10 text-destructive", icon: XCircle },
    DESCARTADA: { label: "Descartada", className: "border-border bg-muted/60 text-muted-foreground", icon: Archive },
};

export function StatusBadge({ status }: { status: string }) {
    const config = statusConfig[status] || {
        label: status,
        className: "border-border bg-muted text-muted-foreground",
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
