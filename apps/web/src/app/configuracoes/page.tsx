"use client";

import Link from "next/link";
import { Layout } from "@/components/layout";
import {
    Settings, User, Bell, ShieldCheck, ChevronRight,
    Moon, Sun, Monitor, CheckCircle2, Lock,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

/* ─── Theme helper ─────────────────────────────────────────── */
type ThemeOption = "light" | "dark" | "system";

function getStoredTheme(): ThemeOption {
    if (typeof window === "undefined") return "system";
    return (localStorage.getItem("theme") as ThemeOption) || "system";
}

function applyTheme(theme: ThemeOption) {
    const root = document.documentElement;
    if (theme === "dark") {
        root.classList.add("dark");
    } else if (theme === "light") {
        root.classList.remove("dark");
    } else {
        // system
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        root.classList.toggle("dark", prefersDark);
    }
    localStorage.setItem("theme", theme);
}

/* ─── Sub-components ───────────────────────────────────────── */

function SectionCard({
    href,
    icon: Icon,
    iconColor,
    iconBg,
    title,
    description,
    badge,
}: {
    href: string;
    icon: React.ElementType;
    iconColor: string;
    iconBg: string;
    title: string;
    description: string;
    badge?: string;
}) {
    return (
        <Link
            href={href}
            className="group flex items-center gap-4 p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm transition-all duration-150"
        >
            <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", iconBg)}>
                <Icon className={cn("w-5 h-5", iconColor)} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-slate-900 dark:text-slate-100 text-[15px]">{title}</span>
                    {badge && (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            {badge}
                        </span>
                    )}
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{description}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
        </Link>
    );
}

/* ─── Main Page ──────────────────────────────────────────────── */

export default function ConfiguracoesPage() {
    const { user } = useAuth();
    const [theme, setTheme] = useState<ThemeOption>("system");

    useEffect(() => {
        setTheme(getStoredTheme());
    }, []);

    function handleThemeChange(t: ThemeOption) {
        setTheme(t);
        applyTheme(t);
    }

    const ROLE_LABELS: Record<string, string> = {
        SUPER_ADMIN: "Super Administrador",
        ADMIN: "Administrador",
        COLABORADOR: "Colaborador",
    };

    const themeOptions: { value: ThemeOption; label: string; icon: React.ElementType }[] = [
        { value: "light", label: "Claro", icon: Sun },
        { value: "dark", label: "Escuro", icon: Moon },
        { value: "system", label: "Sistema", icon: Monitor },
    ];

    return (
        <Layout>
            <div className="max-w-2xl mx-auto space-y-8">

                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                        <Settings className="w-6 h-6 text-blue-600" />
                        Configurações
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Gerencie suas preferências de conta, notificações e aparência.
                    </p>
                </div>

                {/* User summary */}
                <div className="flex items-center gap-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900">
                    <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white text-base font-bold select-none shrink-0">
                        {user?.name?.substring(0, 2).toUpperCase() || "??"}
                    </div>
                    <div className="min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{user?.name || "—"}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{user?.email || "—"}</p>
                        <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-medium text-blue-600 dark:text-blue-400">
                            <ShieldCheck className="w-3 h-3" />
                            {ROLE_LABELS[user?.role || ""] || user?.role}
                        </span>
                    </div>
                </div>

                {/* Section: Conta */}
                <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1">
                        Conta
                    </p>
                    <SectionCard
                        href="/perfil"
                        icon={User}
                        iconColor="text-blue-600 dark:text-blue-400"
                        iconBg="bg-blue-50 dark:bg-blue-950/50"
                        title="Perfil"
                        description="Editar nome, alterar senha e preferências de acessibilidade"
                    />
                    <SectionCard
                        href="/configuracoes/notificacoes"
                        icon={Bell}
                        iconColor="text-amber-600 dark:text-amber-400"
                        iconBg="bg-amber-50 dark:bg-amber-950/50"
                        title="Notificações por Email"
                        description="Controle quais alertas você recebe e com qual frequência"
                    />
                    <SectionCard
                        href="/redefinir-senha"
                        icon={Lock}
                        iconColor="text-red-600 dark:text-red-400"
                        iconBg="bg-red-50 dark:bg-red-950/50"
                        title="Redefinir Senha"
                        description="Solicite um link de redefinição no seu email cadastrado"
                    />
                </div>

                {/* Section: Aparência */}
                <div className="space-y-3">
                    <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1">
                        Aparência
                    </p>
                    <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-3">
                        <div>
                            <p className="font-semibold text-slate-900 dark:text-slate-100 text-[15px] mb-0.5">Tema</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Escolha entre tema claro, escuro ou igual ao sistema operacional.</p>
                        </div>
                        <div
                            className="grid grid-cols-3 gap-2"
                            role="group"
                            aria-label="Seleção de tema"
                        >
                            {themeOptions.map(({ value, label, icon: Icon }) => (
                                <button
                                    key={value}
                                    onClick={() => handleThemeChange(value)}
                                    aria-pressed={theme === value}
                                    aria-label={`Tema ${label}`}
                                    className={cn(
                                        "flex flex-col items-center gap-2 py-3 px-2 rounded-xl border text-sm font-medium transition-all duration-150",
                                        theme === value
                                            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-sm"
                                            : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"
                                    )}
                                >
                                    <Icon className="w-5 h-5" />
                                    <span className="text-xs">{label}</span>
                                    {theme === value && <CheckCircle2 className="w-3 h-3 text-blue-500" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </Layout>
    );
}
