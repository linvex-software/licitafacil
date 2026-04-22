"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { api } from "@/lib/api";
import { Eye, EyeOff, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { Logo } from "@/components/logo";

const schema = z
    .object({
        novaSenha: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
        confirmar: z.string().min(1, "Confirme a senha"),
    })
    .refine((d) => d.novaSenha === d.confirmar, {
        path: ["confirmar"],
        message: "As senhas não coincidem",
    });

type FormValues = z.infer<typeof schema>;

function RedefinirSenhaContent() {
    const params = useSearchParams();
    const router = useRouter();
    const token = params.get("token");

    const [showNova, setShowNova] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [sucesso, setSucesso] = useState(false);
    const [erro, setErro] = useState<string | null>(null);

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: { novaSenha: "", confirmar: "" },
    });

    const onSubmit = async (data: FormValues) => {
        if (!token) {
            setErro("Link inválido. Solicite uma nova redefinição de senha.");
            return;
        }
        setLoading(true);
        setErro(null);
        try {
            await api.post("/auth/reset-password", { token, novaSenha: data.novaSenha });
            setSucesso(true);
        } catch (err: any) {
            setErro(err?.response?.data?.message || "Token inválido ou expirado.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
            <div className="w-full max-w-sm space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

                {/* Logo */}
                <div className="flex justify-center">
                    <Logo size="md" />
                </div>

                {sucesso ? (
                    <div className="space-y-4 rounded-xl border border-border bg-muted p-6 text-center">
                        <CheckCircle2 className="mx-auto h-12 w-12 text-foreground" />
                        <H2>Senha redefinida!</H2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Sua senha foi alterada com sucesso. Você já pode fazer login.
                        </p>
                        <Button
                            className="w-full bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 h-11"
                            onClick={() => router.push("/login")}
                        >
                            Ir para o login
                        </Button>
                    </div>
                ) : (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 shadow-sm space-y-6">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Nova senha</h1>
                            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
                                Escolha uma senha segura para sua conta.
                            </p>
                        </div>

                        {!token && (
                            <div className="flex items-center gap-2 p-3 rounded-lg border border-destructive/25 bg-destructive/10 text-sm text-destructive">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                Link inválido. Solicite uma nova redefinição de senha.
                            </div>
                        )}

                        {erro && (
                            <div className="flex items-center gap-2 p-3 rounded-lg border border-destructive/25 bg-destructive/10 text-sm text-destructive">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                {erro}
                            </div>
                        )}

                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField control={form.control} name="novaSenha" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nova senha</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input
                                                    {...field}
                                                    type={showNova ? "text" : "password"}
                                                    placeholder="Mínimo 6 caracteres"
                                                    aria-label="Nova senha"
                                                    className="h-11 pr-10"
                                                    disabled={!token}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowNova(p => !p)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                    aria-label={showNova ? "Ocultar senha" : "Mostrar senha"}
                                                >
                                                    {showNova ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                <FormField control={form.control} name="confirmar" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Confirmar senha</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input
                                                    {...field}
                                                    type={showConfirm ? "text" : "password"}
                                                    placeholder="Repita a nova senha"
                                                    aria-label="Confirmar nova senha"
                                                    className="h-11 pr-10"
                                                    disabled={!token}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowConfirm(p => !p)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                    aria-label={showConfirm ? "Ocultar confirmação" : "Mostrar confirmação"}
                                                >
                                                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                <Button
                                    type="submit"
                                    disabled={loading || !token}
                                    className="w-full bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 h-11 font-bold"
                                >
                                    {loading ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Redefinindo...</>
                                    ) : "Redefinir senha"}
                                </Button>
                            </form>
                        </Form>

                        <p className="text-center text-sm">
                            <a href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
                                Voltar ao login
                            </a>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

function H2({ children }: { children: React.ReactNode }) {
    return <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{children}</h2>;
}

export default function RedefinirSenhaPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        }>
            <RedefinirSenhaContent />
        </Suspense>
    );
}
