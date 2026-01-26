import { Card, CardContent } from "@/components/ui/Card";
import { LucideIcon } from "lucide-react";

interface MetricsCardProps {
    title: string;
    value: string | number;
    description: string;
    icon: LucideIcon;
    variant?: "default" | "success" | "warning" | "danger";
}

const variantStyles = {
    default: "bg-slate-50 text-slate-600",
    success: "bg-emerald-50 text-emerald-600",
    warning: "bg-amber-50 text-amber-600",
    danger: "bg-red-50 text-red-600",
};

export function MetricsCard({ title, value, description, icon: Icon, variant = "default" }: MetricsCardProps) {
    return (
        <Card className="hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-500">{title}</p>
                        <div className="flex items-baseline gap-2">
                            <h2 className="text-2xl font-bold text-slate-900">{value}</h2>
                        </div>
                        <p className="text-xs text-slate-400">{description}</p>
                    </div>
                    <div className={`p-3 rounded-xl ${variantStyles[variant]}`}>
                        <Icon className="w-6 h-6" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
