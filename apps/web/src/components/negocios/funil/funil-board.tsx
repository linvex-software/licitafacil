"use client";

import React, { useState, useEffect } from "react";
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { FunilColumn } from "./funil-column";
import { FunilCard } from "./funil-card";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Bid {
    id: string;
    title: string;
    agency: string;
    modality: string;
    legalStatus: string;
    operationalState: string;
}

interface FunilBoardProps {
    initialBids: Bid[];
}

const COLUMNS = [
    { id: "ANALISANDO", title: "Analisando", color: "text-gray-700 dark:text-gray-300" },
    { id: "PARTICIPANDO", title: "Participando", color: "text-blue-700 dark:text-blue-400" },
    { id: "AGUARDANDO_RESULTADO", title: "Aguardando Resultado", color: "text-orange-600 dark:text-orange-400" },
    { id: "VENCIDA", title: "Vencidas ✅", color: "text-green-700 dark:text-green-400" },
    { id: "PERDIDA", title: "Perdidas ❌", color: "text-red-700 dark:text-red-400" },
];

export function FunilBoard({ initialBids }: FunilBoardProps) {
    const { toast } = useToast();
    const [bids, setBids] = useState<Bid[]>(initialBids);
    const [activeBid, setActiveBid] = useState<Bid | null>(null);

    useEffect(() => {
        setBids(initialBids);
    }, [initialBids]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5, // Requires 5px drag before activation to not interfere with clicks on mobile
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        if (active.data.current?.type === "Bid") {
            setActiveBid(active.data.current.bid as Bid);
        }
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        if (activeId === overId) return;

        const isActiveABid = active.data.current?.type === "Bid";
        const isOverABid = over.data.current?.type === "Bid";
        const isOverAColumn = over.data.current?.type === "Column";

        if (!isActiveABid) return;

        // Moving over another bid
        if (isActiveABid && isOverABid) {
            setBids((prev) => {
                const activeIndex = prev.findIndex((t) => t.id === activeId);
                const overIndex = prev.findIndex((t) => t.id === overId);

                if (prev[activeIndex].legalStatus !== prev[overIndex].legalStatus) {
                    const updated = [...prev];
                    updated[activeIndex] = {
                        ...updated[activeIndex],
                        legalStatus: updated[overIndex].legalStatus,
                    };
                    return updated;
                }
                return prev;
            });
        }

        // Moving over empty column area
        if (isActiveABid && isOverAColumn) {
            setBids((prev) => {
                const activeIndex = prev.findIndex((t) => t.id === activeId);
                if (prev[activeIndex].legalStatus !== overId) {
                    const updated = [...prev];
                    updated[activeIndex] = {
                        ...updated[activeIndex],
                        legalStatus: overId as string,
                    };
                    return updated;
                }
                return prev;
            });
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        setActiveBid(null);
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id as string;
        const bidBeforeMove = initialBids.find(b => b.id === activeId);
        if (!bidBeforeMove) return;

        // Find the new column from local state (already optimistically updated in dragOver)
        const bidAfterMove = bids.find(b => b.id === activeId);
        if (!bidAfterMove || bidBeforeMove.legalStatus === bidAfterMove.legalStatus) {
            return; // No real movement changed column
        }

        const newColumn = bidAfterMove.legalStatus;

        try {
            // Async Sync With Backend
            await api.patch(`/bids/${activeId}/mover-coluna`, {
                coluna: newColumn,
            });
        } catch (err) {
            toast({
                title: "Erro ao mover licitação",
                description: "As alterações foram desfeitas. Tente novamente.",
                variant: "destructive",
            });
            // Rollback to original props injected
            setBids(initialBids);
        }
    };

    const handleManualMove = async (bidId: string, newColumn: string) => {
        const bidBeforeMove = bids.find(b => b.id === bidId);
        if (!bidBeforeMove || bidBeforeMove.legalStatus === newColumn) return;

        // Optimistic update
        setBids(prev => prev.map(b => b.id === bidId ? { ...b, legalStatus: newColumn } : b));

        try {
            await api.patch(`/bids/${bidId}/mover-coluna`, {
                coluna: newColumn,
            });
        } catch (err) {
            toast({
                title: "Erro ao mover licitação",
                description: "As alterações foram desfeitas. Tente novamente.",
                variant: "destructive",
            });
            setBids(initialBids);
        }
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="flex gap-4 h-full min-w-max pb-2">
                {COLUMNS.map((col) => (
                    <FunilColumn
                        key={col.id}
                        id={col.id}
                        title={col.title}
                        titleColor={col.color}
                        bids={bids.filter((b) => b.legalStatus === col.id)}
                        onMove={handleManualMove}
                    />
                ))}
            </div>

            {/* Drag Overlay for smooth animations while pointer holds the card */}
            <DragOverlay>
                {activeBid ? <FunilCard bid={activeBid} /> : null}
            </DragOverlay>
        </DndContext>
    );
}
