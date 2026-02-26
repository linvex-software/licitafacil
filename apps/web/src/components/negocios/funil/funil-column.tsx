"use client";

import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { FunilCard } from "./funil-card";

interface Bid {
    id: string;
    title: string;
    agency: string;
    modality: string;
    legalStatus: string;
    operationalState: string;
}

interface FunilColumnProps {
    id: string;
    title: string;
    bids: Bid[];
    titleColor?: string;
    onMove: (bidId: string, column: string) => void | Promise<void>;
    onOpenDetails?: (bidId: string) => void;
}

export function FunilColumn({ id, title, bids, onMove, onOpenDetails, titleColor = "text-gray-700 dark:text-gray-300" }: FunilColumnProps) {
    const { setNodeRef, isOver } = useDroppable({
        id: id,
        data: {
            type: "Column",
            column: id,
        },
    });

    return (
        <div className="w-72 h-full flex flex-col flex-shrink-0">
            <div className="flex items-center justify-between mb-2 px-3 py-2 bg-gray-200/50 dark:bg-zinc-800/50 rounded-t-lg">
                <h3 className={`font-bold text-sm ${titleColor}`}>
                    {title}
                </h3>
                <span className="bg-gray-300 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-none">
                    {bids.length}
                </span>
            </div>

            <div
                ref={setNodeRef}
                className={`flex-1 bg-gray-100/50 dark:bg-zinc-800/50 rounded-lg p-2 overflow-y-auto transition-colors ${isOver ? "bg-blue-50/50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800" : "border border-transparent"
                    }`}
            >
                <SortableContext items={bids.map(b => b.id)} strategy={verticalListSortingStrategy}>
                    <div className="flex flex-col gap-2 min-h-[100px]">
                        {bids.map((bid) => (
                            <FunilCard key={bid.id} bid={bid} onMove={onMove} onOpenDetails={onOpenDetails} />
                        ))}
                    </div>
                </SortableContext>
            </div>
        </div>
    );
}
