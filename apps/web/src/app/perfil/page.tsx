"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import {
    applyFontSize, applyContrast, loadAccessibilityPrefs,
    type FontSize, type Contrast as A11yContrast,
} from "@/lib/accessibility";
import {
    User, Lock, Eye, EyeOff, Save, ShieldCheck,
    ZoomIn, Contrast, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Schemas ──────────────

const nomeSchema = z.object({
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
});
type NomeForm = z.infer<typeof nomeSchema>;

const senhaSchema = z
    .object({
        senhaAtual: z.string().min(1, "Informe a senha atual"),
        novaSenha: z.string().min(6, "A nova senha deve ter pelo menos 6 caracteres"),
        confirmarSenha: z.string().min(1, "Confirme a nova senha"),
    })
    .refine((d) => d.novaSenha === d.confirmarSenha, {
        path: ["confirmarSenha"],
        message: "As senhas não coincidem",
    });
type SenhaForm = z.infer<typeof senhaSchema>;

// ─── Componente ───────────────────────────────────────────────

export default function PerfilPage() {
    const { user } = useAuth();
    const { toast } = useToast();

    // Acessibilidade
    const [fontSize, setFontSize] = useState<FontSize>("normal");
    const [contraste, setContraste] = useState<A11yContrast>("default");

    useEffect(() => {
        const prefs = loadAccessibilityPrefs();
        setFontSize(prefs.size);
        setContraste(prefs.contrast);
    }, []);

    const handleFontSize = (size: FontSize) => {
        setFontSize(size);
        applyFontSize(size);
    };

    const handleContrast = (c: A11yContrast) => {
        setContraste(c);
        applyContrast(c);
    };

    // ─── Form nome ──────────────
    const [savingNome, setSavingNome] = useState(false);
    const nomeForm = useForm<NomeForm>({
        resolver: zodResolver(nomeSchema),
        defaultValues: { name: user?.name || "" },
    });

    // Atualiza o form quando user carrega
    useEffect(() => {
        if (user?.name) nomeForm.setValue("name", user.name);
    }, [user?.name]);

    const onSaveNome = async (data: NomeForm) => {
        setSavingNome(true);
        try {
            await api.patch("/auth/me", { name: data.name });
            // Atualiza o token com os novos dados (refaz login com mesmo token)
            toast({ title: "Nome atualizado!", description: "Recarregue a página para ver o nome atualizado no menu." });
        } catch {
            toast({ title: "Erro ao atualizar nome", variant: "destructive" });
        } finally {
            setSavingNome(false);
        }
    };

    // ─── Form senha ──────────────
    const [savingSenha, setSavingSenha] = useState(false);
    const [showSenhaAtual, setShowSenhaAtual] = useState(false);
    const [showNovaSenha, setShowNovaSenha] = useState(false);
    const [showConfirmar, setShowConfirmar] = useState(false);
    const senhaForm = useForm<SenhaForm>({
        resolver: zodResolver(senhaSchema),
        defaultValues: { senhaAtual: "", novaSenha: "", confirmarSenha: "" },
    });

    const onSaveSenha = async (data: SenhaForm) => {
        setSavingSenha(true);
        try {
            await api.patch("/auth/me/senha", {
                senhaAtual: data.senhaAtual,
                novaSenha: data.novaSenha,
            });
            toast({ title: "Senha alterada com sucesso!" });
            senhaForm.reset();
        } catch (err: any) {
            const msg = err?.response?.data?.message || "Erro ao alterar senha";
            toast({ title: msg, variant: "destructive" });
        } finally {
            setSavingSenha(false);
        }
    };

    const ROLE_LABELS: Record<string, string> = {
        SUPER_ADMIN: "Super Administrador",
        ADMIN: "Administrador",
        COLABORADOR: "Colaborador",
    };

    return (
        <Layout>
            <div className="max-w-2xl mx-auto space-y-8">

                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100">
                        <User className="w-6 h-6 text-blue-600" />
                        Meu Perfil
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Gerencie suas informações pessoais e preferências de acessibilidade.
                    </p>
                </div>

                {/* Card: Informações da conta (somente leitura) */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold select-none">
                            {user?.name?.substring(0, 2).toUpperCase() || "??"}
                        </div>
                        <div>
                            <p className="font-semibold text-slate-900 dark:text-slate-100 text-lg">{user?.name}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{user?.email}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 w-fit">
                        <ShieldCheck className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {ROLE_LABELS[user?.role || ""] || user?.role}
                        </span>
                    </div>
                </div>

                {/* Card: Editar nome */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
                    <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                        <User className="w-4 h-4" /> Editar nome
                    </h2>
                    <Form {...nomeForm}>
                        <form onSubmit={nomeForm.handleSubmit(onSaveNome)} className="flex gap-3">
                            <FormField
                                control={nomeForm.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem className="flex-1">
                                        <FormLabel className="sr-only">Nome</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                placeholder="Seu nome completo"
                                                className="h-10"
                                                aria-label="Nome completo"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" disabled={savingNome} className="h-10" aria-label="Salvar nome">
                                <Save className="w-4 h-4 mr-1" />
                                {savingNome ? "Salvando..." : "Salvar"}
                            </Button>
                        </form>
                    </Form>
                </div>

                {/* Card: Alterar senha */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
                    <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                        <Lock className="w-4 h-4" /> Alterar senha
                    </h2>
                    <Form {...senhaForm}>
                        <form onSubmit={senhaForm.handleSubmit(onSaveSenha)} className="space-y-4">
                            {/* Senha atual */}
                            <FormField control={senhaForm.control} name="senhaAtual" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Senha atual</FormLabel>
                                    <div className="relative">
                                        <FormControl>
                                            <Input
                                                {...field}
                                                type={showSenhaAtual ? "text" : "password"}
                                                placeholder="••••••••"
                                                aria-label="Senha atual"
                                                className="h-10 pr-10"
                                            />
                                        </FormControl>
                                        <button
                                            type="button"
                                            onClick={() => setShowSenhaAtual(p => !p)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                            aria-label={showSenhaAtual ? "Ocultar senha atual" : "Mostrar senha atual"}
                                        >
                                            {showSenhaAtual ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            {/* Nova senha */}
                            <FormField control={senhaForm.control} name="novaSenha" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nova senha</FormLabel>
                                    <div className="relative">
                                        <FormControl>
                                            <Input
                                                {...field}
                                                type={showNovaSenha ? "text" : "password"}
                                                placeholder="Mínimo 6 caracteres"
                                                aria-label="Nova senha"
                                                className="h-10 pr-10"
                                            />
                                        </FormControl>
                                        <button
                                            type="button"
                                            onClick={() => setShowNovaSenha(p => !p)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                                            aria-label={showNovaSenha ? "Ocultar nova senha" : "Mostrar nova senha"}
                                        >
                                            {showNovaSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            {/* Confirmar */}
                            <FormField control={senhaForm.control} name="confirmarSenha" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Confirmar nova senha</FormLabel>
                                    <div className="relative">
                                        <FormControl>
                                            <Input
                                                {...field}
                                                type={showConfirmar ? "text" : "password"}
                                                placeholder="Repita a nova senha"
                                                aria-label="Confirmar nova senha"
                                                className="h-10 pr-10"
                                            />
                                        </FormControl>
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmar(p => !p)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                                            aria-label={showConfirmar ? "Ocultar confirmação de senha" : "Mostrar confirmação de senha"}
                                        >
                                            {showConfirmar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <Button type="submit" disabled={savingSenha} aria-label="Alterar senha">
                                <Lock className="w-4 h-4 mr-1" />
                                {savingSenha ? "Alterando..." : "Alterar senha"}
                            </Button>
                        </form>
                    </Form>
                </div>

                {/* Card: Acessibilidade */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
                    <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-2">
                        <ZoomIn className="w-4 h-4" /> Acessibilidade
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
                        Ajuste as preferências de visualização para maior conforto.
                    </p>

                    <div className="mb-5">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2" id="a11y-font-size-label">
                            Tamanho do texto
                        </label>
                        <div className="flex gap-2" role="group" aria-labelledby="a11y-font-size-label">
                            {(["normal", "large", "xlarge"] as FontSize[]).map((size) => {
                                const labels = { normal: "Normal", large: "Grande", xlarge: "Extra grande" };
                                const icons = { normal: <span className="text-sm">A</span>, large: <span className="text-base font-bold">A</span>, xlarge: <span className="text-lg font-bold">A</span> };
                                return (
                                    <button
                                        key={size}
                                        onClick={() => handleFontSize(size)}
                                        aria-pressed={fontSize === size}
                                        aria-label={`Fonte ${labels[size]}`}
                                        className={cn(
                                            "flex-1 py-2 px-3 rounded-lg border text-center transition-all flex flex-col items-center gap-1",
                                            fontSize === size
                                                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
                                                : "border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-600 dark:text-slate-400"
                                        )}
                                    >
                                        {icons[size]}
                                        <span className="text-xs">{labels[size]}</span>
                                        {fontSize === size && <CheckCircle2 className="w-3 h-3 text-blue-500" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Alto contraste */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2" id="a11y-contrast-label">
                            Contraste
                        </label>
                        <div className="flex gap-2" role="group" aria-labelledby="a11y-contrast-label">
                            {(["default", "high"] as A11yContrast[]).map((c) => {
                                const label = c === "default" ? "Padrão" : "Alto contraste";
                                return (
                                    <button
                                        key={c}
                                        onClick={() => handleContrast(c)}
                                        aria-pressed={contraste === c}
                                        aria-label={`Contraste ${label}`}
                                        className={cn(
                                            "flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2",
                                            contraste === c
                                                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
                                                : "border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-600 dark:text-slate-400"
                                        )}
                                    >
                                        <Contrast className="w-4 h-4" />
                                        {label}
                                        {contraste === c && <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />}
                                    </button>
                                );
                            })}
                        </div>
                        {contraste === "high" && (
                            <p className="text-xs text-slate-400 mt-2">
                                Alto contraste aumenta a espessura das bordas e satura as cores para maior legibilidade.
                            </p>
                        )}
                    </div>
                </div>

            </div>
        </Layout>
    );
}
