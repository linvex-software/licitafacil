"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";

export type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
    theme: Theme;
    toggleTheme: () => void;
    setTheme: (t: Theme) => void;
}

function getDarkFromTheme(t: Theme): boolean {
    if (typeof window === "undefined") return true;
    if (t === "dark") return true;
    if (t === "light") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyDomTheme(t: Theme) {
    const root = document.documentElement;
    root.classList.toggle("dark", getDarkFromTheme(t));
}

const ThemeContext = createContext<ThemeContextValue>({
    theme: "system",
    toggleTheme: () => {},
    setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>("system");

    const setTheme = useCallback((t: Theme) => {
        setThemeState(t);
        applyDomTheme(t);
        try {
            localStorage.setItem("theme", t);
        } catch {
            /* ignore */
        }
    }, []);

    useEffect(() => {
        const stored = localStorage.getItem("theme") as Theme | null;
        const initial: Theme =
            stored === "light" || stored === "dark" || stored === "system"
                ? stored
                : "system";
        setThemeState(initial);
        applyDomTheme(initial);
    }, []);

    useEffect(() => {
        if (theme !== "system") return;
        const mq = window.matchMedia("(prefers-color-scheme: dark)");
        const onChange = () => applyDomTheme("system");
        mq.addEventListener("change", onChange);
        return () => mq.removeEventListener("change", onChange);
    }, [theme]);

    const toggleTheme = useCallback(() => {
        const root = document.documentElement;
        const darkNow = root.classList.contains("dark");
        setTheme(darkNow ? "light" : "dark");
    }, [setTheme]);

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
