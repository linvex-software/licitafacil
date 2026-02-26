"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Building2, AlertCircle, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface Bid {
    id: string;
    title: string;
    agency: string;
    modality: string;
    legalStatus: string;
    operationalState: string;
}

interface FunilCardProps {
    bid: Bid;
    onMove?: (bidId: string, columnId: string) => void;
}

const COLUMNS = [
    { id: "ANALISANDO", title: "Analisando" },
    { id: "PARTICIPANDO", title: "Participando" },
    { id: "AGUARDANDO_RESULTADO", title: "Aguardando Resultado" },
    { id: "VENCIDA", title: "Vencida" },
    { id: "PERDIDA", title: "Perdida" },
];

export function FunilCard({ bid, onMove }: FunilCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: bid.id,
        data: {
            type: "Bid",
            bid,
        },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const isAtRisk = bid.operationalState === "EM_RISCO";

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={cn(
                "cursor-grab active:cursor-grabbing mb-3",
                isDragging && "opacity-40"
            )}
        >
            <Card className={cn(
                "p-3 hover:shadow-md transition-shadow dark:bg-zinc-900 border",
                isAtRisk ? "border-red-300 dark:border-red-900/50" : "border-gray-200 dark:border-zinc-800"
            )}>
                <div className="flex justify-between items-start gap-2 mb-2">
                    <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 bg-gray-50 dark:bg-zinc-800">
                        {bid.modality.replace('_', ' ')}
                    </Badge>
                    <div className="flex items-center gap-1">
                        {isAtRisk && (
                            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        )}

                        {onMove && (
                            <div onClick={(e) => e.stopPropagation()}>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6">
                                            <MoreHorizontal className="w-4 h-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Mover para...</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        {COLUMNS.filter(c => c.id !== bid.legalStatus).map(col => (
                                            <DropdownMenuItem key={col.id} onClick={() => onMove(bid.id, col.id)}>
                                                {col.title}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        )}
                    </div>
                </div>

                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2 leading-tight mb-2">
                    {bid.title || "Sem objeto"}
                </h4>

                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{bid.agency}</span>
                </div>
            </Card>
        </div>
    );
}
