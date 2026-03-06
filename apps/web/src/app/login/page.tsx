"use client"

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Logo } from "@/components/logo";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});
type LoginFormValues = z.infer<typeof loginSchema>;

const forgotSchema = z.object({
  email: z.string().email("Email inválido"),
});
type ForgotFormValues = z.infer<typeof forgotSchema>;

export default function LoginPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  // Modal "Esqueceu a senha?"
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const forgotForm = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: form.getValues("email") || "" },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    try {
      const response = await api.post("/auth/login", data);
      const { accessToken, user } = response.data;
      login(accessToken, user);
      toast({ title: "Login realizado", description: `Bem-vindo, ${user.name}!` });
      router.push("/");
    } catch (error: any) {
      const msg = error.response?.data?.message || "Ocorreu um erro inesperado";
      toast({ title: "Erro no login", description: msg, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onForgot = async (data: ForgotFormValues) => {
    setForgotLoading(true);
    setForgotError(null);
    try {
      await api.post("/auth/forgot-password", { email: data.email });
      setForgotSent(true);
    } catch {
      setForgotError("Erro ao enviar o email. Tente novamente.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotOpen = () => {
    // Pré-preenche com o email do form de login, se houver
    forgotForm.setValue("email", form.getValues("email") || "");
    setForgotSent(false);
    setForgotError(null);
    setForgotOpen(true);
  };

  const handleSubmit = form.handleSubmit(onSubmit);
  const emailField = form.register("email");
  const passwordField = form.register("password");

  return (
    <>
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm flex flex-col items-center gap-6 py-10 px-8 rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex justify-center w-full">
            <Logo size="md" />
          </div>

          <div className="w-12 h-px bg-border mx-auto" />

          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-sm font-medium text-foreground">
                E-mail
              </label>
              <input
                type="email"
                placeholder="seu@email.com"
                required
                name={emailField.name}
                ref={emailField.ref}
                onChange={emailField.onChange}
                onBlur={emailField.onBlur}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2A4A] dark:focus:ring-blue-500 transition"
              />
              {form.formState.errors.email && (
                <p className="text-destructive text-xs">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="flex justify-end w-full -mt-2">
              <button
                type="button"
                onClick={handleForgotOpen}
                className="text-xs text-[#1B2A4A] dark:text-blue-400 hover:underline"
              >
                Esqueceu sua senha?
              </button>
            </div>

            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-sm font-medium text-foreground">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  name={passwordField.name}
                  ref={passwordField.ref}
                  onChange={passwordField.onChange}
                  onBlur={passwordField.onBlur}
                  className="w-full px-3 py-2.5 pr-10 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2A4A] dark:focus:ring-blue-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="text-destructive text-xs">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-lg font-semibold text-sm text-white bg-[#040319] hover:bg-[#1B2A4A] dark:bg-blue-600 dark:hover:bg-blue-700 transition-colors mt-2 disabled:opacity-80"
            >
              {isSubmitting ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>
      </div>

      {/* Modal: Esqueceu a senha */}
      <Dialog open={forgotOpen} onOpenChange={(o) => { setForgotOpen(o); if (!o) { setForgotSent(false); setForgotError(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Recuperar senha</DialogTitle>
          </DialogHeader>

          {forgotSent ? (
            <div className="py-4 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <p className="font-semibold text-gray-900 dark:text-gray-100">Email enviado!</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Se o email estiver cadastrado, você receberá as instruções para redefinir sua senha em breve.
                Verifique também a caixa de spam.
              </p>
              <Button className="w-full mt-2" variant="outline" onClick={() => setForgotOpen(false)}>
                Fechar
              </Button>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Informe o email da sua conta e enviaremos um link para redefinir sua senha.
              </p>

              {forgotError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {forgotError}
                </div>
              )}

              <Form {...forgotForm}>
                <form onSubmit={forgotForm.handleSubmit(onForgot)} className="space-y-4">
                  <FormField control={forgotForm.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail da conta</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="nome@empresa.com.br"
                          aria-label="E-mail para recuperação"
                          className="h-11"
                          autoFocus
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button
                    type="submit"
                    className="w-full h-11 font-bold"
                    disabled={forgotLoading}
                    aria-label="Enviar email de recuperação"
                  >
                    {forgotLoading ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enviando...</>
                    ) : "Enviar link de recuperação"}
                  </Button>
                </form>
              </Form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
