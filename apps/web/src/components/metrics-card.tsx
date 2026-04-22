import { Card, CardContent } from "@/components/ui/Card";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricsCardProps {
    title: string;
    value: string | number;
    description: string;
    icon: LucideIcon;
    variant?: "default" | "success" | "warning" | "danger" | "info";
    trend?: { value: number; label: string };
}

const variants = {
    default: {
        iconBg: "bg-muted",
        iconClr: "text-muted-foreground",
        valClr: "text-foreground",
        bar: "bg-border",
    },
    info: {
        iconBg: "bg-muted",
        iconClr: "text-muted-foreground",
        valClr: "text-foreground",
        bar: "bg-muted-foreground",
    },
    success: {
        iconBg: "bg-muted",
        iconClr: "text-foreground",
        valClr: "text-foreground",
        bar: "bg-foreground/50",
    },
    warning: {
        iconBg: "bg-muted",
        iconClr: "text-muted-foreground",
        valClr: "text-foreground",
        bar: "bg-foreground/30",
    },
    danger: {
        iconBg: "bg-destructive/10",
        iconClr: "text-destructive",
        valClr: "text-destructive",
        bar: "bg-destructive",
    },
};

export function MetricsCard({
    title, value, description, icon: Icon, variant = "default", trend
}: MetricsCardProps) {
    const v = variants[variant];

    return (
        <Card className="hover:shadow-md overflow-hidden">
            {/* accent bar */}
            <div className={cn("h-[3px] w-full", v.bar)} />
            <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 min-w-0">
                        <p className="section-label">{title}</p>
                        <p className={cn("text-[28px] font-bold leading-none stat-number", v.valClr)}>
                            {value}
                        </p>
                        <p className="text-[12px] text-muted-foreground">{description}</p>
                        {trend && (
                            <p className={cn(
                                "text-[11px] font-semibold",
                                trend.value >= 0 ? "text-foreground" : "text-destructive"
                            )}>
                                {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}% {trend.label}
                            </p>
                        )}
                    </div>
                    <div className={cn("p-2.5 rounded-xl shrink-0", v.iconBg, v.iconClr)}>
                        <Icon className="w-5 h-5" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
