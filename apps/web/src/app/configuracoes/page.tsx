"use client";

import Link from "next/link";
import { Layout } from "@/components/layout";
import {
    Settings, User, Bell, ShieldCheck, ChevronRight,
    Moon, Sun, Monitor, CheckCircle2, Lock, Puzzle,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { useState, useEffect, type ElementType } from "react";
import { getConfigAlertaPregao, saveConfigAlertaPregao } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useTheme, type Theme as ThemeOption } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";

/* ─── Sub-components ───────────────────────────────────────── */

function SectionCard({
    href,
    icon: Icon,
    title,
    description,
    badge,
}: {
    href: string;
    icon: ElementType;
    title: string;
    description: string;
    badge?: string;
}) {
    return (
        <Link
            href={href}
            className="group flex items-center gap-4 rounded-xl border border-border bg-card p-5 text-card-foreground transition-all duration-150 hover:border-muted-foreground/40 hover:bg-accent/60"
        >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted">
                <Icon className="h-5 w-5 text-foreground" />
            </div>
            <div className="min-w-0 flex-1">
                <div className="mb-0.5 flex items-center gap-2">
                    <span className="text-[15px] font-semibold">{title}</span>
                    {badge && (
                        <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                            {badge}
                        </span>
                    )}
                </div>
                <p className="truncate text-sm text-muted-foreground">{description}</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-foreground" />
        </Link>
    );
}

/* ─── Main Page ──────────────────────────────────────────────── */

export default function ConfiguracoesPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const { theme, setTheme } = useTheme();
    const [minutosAlerta, setMinutosAlerta] = useState(15);
    const [salvandoAlerta, setSalvandoAlerta] = useState(false);

    useEffect(() => {
        getConfigAlertaPregao().then(r => setMinutosAlerta(r.minutosAlertaPregao)).catch(() => {});
    }, []);

    async function salvarAlerta() {
        setSalvandoAlerta(true);
        try {
            await saveConfigAlertaPregao(minutosAlerta);
            toast({ title: "Configuração salva", description: "Alerta de pregão atualizado." });
        } catch {
            toast({ title: "Erro", description: "Não foi possível salvar.", variant: "destructive" });
        } finally {
            setSalvandoAlerta(false);
        }
    }

    function handleThemeChange(t: ThemeOption) {
        setTheme(t);
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
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
                        <Settings className="h-6 w-6 text-muted-foreground" />
                        Configurações
                    </h1>
                    <p className="mt-1 text-muted-foreground">
                        Gerencie suas preferências de conta, notificações e aparência.
                    </p>
                </div>

                {/* User summary */}
                <div className="flex items-center gap-4 rounded-xl border border-border bg-muted/30 p-4">
                    <div className="flex h-12 w-12 shrink-0 select-none items-center justify-center rounded-full bg-muted text-base font-bold text-foreground ring-1 ring-border">
                        {user?.name?.substring(0, 2).toUpperCase() || "??"}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">{user?.name || "—"}</p>
                        <p className="truncate text-sm text-muted-foreground">{user?.email || "—"}</p>
                        <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                            <ShieldCheck className="h-3 w-3" />
                            {ROLE_LABELS[user?.role || ""] || user?.role}
                        </span>
                    </div>
                </div>

                {/* Section: Conta */}
                <div className="space-y-2">
                    <p className="section-label px-1">
                        Conta
                    </p>
                    <SectionCard
                        href="/perfil"
                        icon={User}
                        title="Perfil"
                        description="Editar nome, alterar senha e preferências de acessibilidade"
                    />
                    <SectionCard
                        href="/configuracoes/notificacoes"
                        icon={Bell}
                        title="Notificações por Email"
                        description="Controle quais alertas você recebe e com qual frequência"
                    />
                    <SectionCard
                        href="/extensao"
                        icon={Puzzle}
                        title="Extensão Chrome"
                        description="Instale e use a extensão para integrar com portais de licitação"
                    />
                    <SectionCard
                        href="/redefinir-senha"
                        icon={Lock}
                        title="Redefinir Senha"
                        description="Solicite um link de redefinição no seu email cadastrado"
                    />
                </div>

                {/* Section: Aparência */}
                <div className="space-y-3">
                    <p className="section-label px-1">
                        Aparência
                    </p>
                    <div className="space-y-3 rounded-xl border border-border bg-card p-5 text-card-foreground">
                        <div>
                            <p className="mb-0.5 text-[15px] font-semibold">Tema</p>
                            <p className="text-sm text-muted-foreground">Escolha entre tema claro, escuro ou igual ao sistema operacional.</p>
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
                                        "flex flex-col items-center gap-2 rounded-xl border px-2 py-3 text-sm font-medium transition-all duration-150",
                                        theme === value
                                            ? "border-foreground bg-accent text-foreground shadow-none ring-1 ring-foreground/15"
                                            : "border-border text-muted-foreground hover:border-muted-foreground/50 hover:bg-accent/50"
                                    )}
                                >
                                    <Icon className="h-5 w-5" />
                                    <span className="text-xs">{label}</span>
                                    {theme === value && <CheckCircle2 className="h-3 w-3 text-foreground" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Section: Alertas de Pregão */}
                <div className="space-y-3">
                    <p className="section-label px-1">
                        Monitoramento
                    </p>
                    <div className="space-y-4 rounded-xl border border-border bg-card p-5 text-card-foreground">
                        <div>
                            <p className="mb-0.5 text-[15px] font-semibold">Alertas de Pregão</p>
                            <p className="text-sm text-muted-foreground">
                                Receba um email antes do horário de início dos pregões monitorados.
                            </p>
                        </div>
                        <div className="space-y-3">
                            <p className="text-sm font-medium text-foreground">
                                Alertar quantos minutos antes?
                            </p>
                            <div className="flex flex-wrap items-center gap-2">
                                {[5, 10, 15, 30, 60].map(min => (
                                    <button
                                        key={min}
                                        type="button"
                                        onClick={() => setMinutosAlerta(min)}
                                        className={cn(
                                            "rounded-lg border px-4 py-2 text-sm font-medium transition-all duration-150",
                                            minutosAlerta === min
                                                ? "border-transparent bg-primary text-primary-foreground dark:hover:bg-[#e0e0e0]"
                                                : "border-border bg-background text-foreground hover:border-muted-foreground/40 hover:bg-accent"
                                        )}
                                    >
                                        {min >= 60 ? "1h" : `${min}min`}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Você receberá um email{" "}
                                {minutosAlerta >= 60 ? "1 hora" : `${minutosAlerta} minutos`}{" "}
                                antes do início de cada pregão que você monitorar.
                            </p>
                        </div>
                        <Button
                            type="button"
                            onClick={salvarAlerta}
                            disabled={salvandoAlerta}
                            className="shadow-none"
                        >
                            {salvandoAlerta ? "Salvando..." : "Salvar configuração"}
                        </Button>
                    </div>
                </div>

            </div>
        </Layout>
    );
}
