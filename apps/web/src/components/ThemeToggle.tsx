"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            title={theme === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"}
            className={cn(
                "relative h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
                "text-gray-500 hover:bg-gray-100 hover:text-gray-700",
                "dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200",
                className
            )}
        >
            <Sun className="w-4 h-4 absolute transition-all duration-300 scale-100 opacity-100 dark:scale-0 dark:opacity-0" />
            <Moon className="w-4 h-4 absolute transition-all duration-300 scale-0 opacity-0 dark:scale-100 dark:opacity-100" />
            <span className="sr-only">Alternar tema</span>
        </button>
    );
}
