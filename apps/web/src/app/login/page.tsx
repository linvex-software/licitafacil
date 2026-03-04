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
import { useToast } from "@/hooks/use-toast";
import { Gavel, Loader2, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";

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

  return (
    <>
      <div className="min-h-screen w-full flex flex-col md:flex-row bg-white">
        {/* Left Side: Branding */}
        <div className="hidden md:flex md:w-1/2 bg-[#0a0f1d] relative overflow-hidden flex-col justify-between p-12 text-white">
          <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-[10%] right-[10%] w-64 h-64 bg-emerald-500 rounded-full blur-[120px]" />
            <div className="absolute bottom-[10%] left-[10%] w-96 h-96 bg-blue-500 rounded-full blur-[150px]" />
          </div>
          <div className="relative z-10">
            <div className="max-w-md" />
          </div>
          <div className="relative z-10 grid grid-cols-3 gap-8" />
        </div>

        {/* Right Side: Login Form */}
        <div className="flex-1 flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-950 md:bg-white md:dark:bg-gray-950">
          <div className="w-full max-w-sm space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="md:hidden flex justify-center mb-8">
              <div className="flex items-center gap-2">
                <Gavel className="w-8 h-8 text-emerald-600" />
                <span className="text-2xl font-heading font-bold text-gray-900 dark:text-gray-100">LicitaFácil</span>
              </div>
            </div>

            <div>
              <h2 className="text-3xl font-heading font-bold text-gray-900 dark:text-gray-100">Bem-vindo de volta</h2>
              <p className="text-gray-500 dark:text-gray-400 mt-2">Acesse sua conta para gerenciar seus processos.</p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-gray-700 dark:text-gray-300 font-semibold">E-mail</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="nome@empresa.com.br"
                          {...field}
                          aria-label="E-mail"
                          className="h-12 border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 focus:bg-white dark:focus:bg-gray-800 transition-all"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-gray-700 dark:text-gray-300 font-semibold">Senha</FormLabel>
                        <button
                          type="button"
                          onClick={handleForgotOpen}
                          className="text-xs font-bold text-emerald-600 hover:text-emerald-700 uppercase tracking-wider transition-colors"
                          aria-label="Abrir recuperação de senha"
                        >
                          Esqueceu a senha?
                        </button>
                      </div>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            {...field}
                            aria-label="Senha"
                            className="h-12 border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 focus:bg-white dark:focus:bg-gray-800 transition-all pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(p => !p)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full bg-gray-900 dark:bg-gray-100 hover:bg-gray-800 dark:hover:bg-white text-white dark:text-gray-900 h-12 text-base font-bold transition-all shadow-lg active:scale-[0.98]"
                  disabled={isSubmitting}
                  aria-label="Acessar plataforma"
                >
                  {isSubmitting ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Autenticando...</>
                  ) : "Acessar Plataforma"}
                </Button>
              </form>
            </Form>

            <div className="pt-4 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Ainda não tem acesso?{" "}
                <button className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline">
                  Entre em contato
                </button>
              </p>
            </div>
          </div>
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
