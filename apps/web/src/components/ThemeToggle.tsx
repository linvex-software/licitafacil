"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
    const { theme, toggleTheme } = useTheme();

    const title =
        theme === "system"
            ? "Alternar tema claro/escuro (atual: sistema)"
            : theme === "dark"
              ? "Mudar para tema claro"
              : "Mudar para tema escuro";

    return (
        <button
            onClick={toggleTheme}
            title={title}
            className={cn(
                "relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                "text-muted-foreground hover:bg-accent hover:text-foreground",
                className
            )}
        >
            <Sun className="w-4 h-4 absolute transition-all duration-300 scale-100 opacity-100 dark:scale-0 dark:opacity-0" />
            <Moon className="w-4 h-4 absolute transition-all duration-300 scale-0 opacity-0 dark:scale-100 dark:opacity-100" />
            <span className="sr-only">Alternar tema</span>
        </button>
    );
}
