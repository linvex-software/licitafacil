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
        iconBg: "bg-gray-100 dark:bg-gray-800",
        iconClr: "text-gray-500 dark:text-gray-400",
        valClr: "text-gray-900 dark:text-gray-100",
        bar: "bg-gray-200 dark:bg-gray-700",
    },
    info: {
        iconBg: "bg-blue-50 dark:bg-blue-950",
        iconClr: "text-blue-600 dark:text-blue-400",
        valClr: "text-blue-700 dark:text-blue-400",
        bar: "bg-blue-500",
    },
    success: {
        iconBg: "bg-emerald-50 dark:bg-emerald-950",
        iconClr: "text-emerald-600 dark:text-emerald-400",
        valClr: "text-emerald-700 dark:text-emerald-400",
        bar: "bg-emerald-500",
    },
    warning: {
        iconBg: "bg-amber-50 dark:bg-amber-950",
        iconClr: "text-amber-600 dark:text-amber-400",
        valClr: "text-amber-700 dark:text-amber-400",
        bar: "bg-amber-500",
    },
    danger: {
        iconBg: "bg-red-50 dark:bg-red-950",
        iconClr: "text-red-600 dark:text-red-400",
        valClr: "text-red-700 dark:text-red-400",
        bar: "bg-red-500",
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
                        <p className="text-[12px] text-gray-400 dark:text-gray-500">{description}</p>
                        {trend && (
                            <p className={cn(
                                "text-[11px] font-semibold",
                                trend.value >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
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
