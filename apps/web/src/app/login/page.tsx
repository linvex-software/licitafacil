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
import { useToast } from "@/hooks/use-toast";
import { Gavel, Loader2, ShieldCheck, Zap, BarChart3 } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    try {
      const response = await api.post("/auth/login", data);
      const { accessToken, user } = response.data;

      login(accessToken, user);

      toast({
        title: "Login realizado",
        description: `Bem-vindo, ${user.name}!`,
      });

      router.push("/");
    } catch (error: any) {
      toast({
        title: "Erro no login",
        description: error.response?.data?.message || "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-white">
      {/* Left Side: Branding / Background */}
      <div className="hidden md:flex md:w-1/2 bg-[#0a0f1d] relative overflow-hidden flex-col justify-between p-12 text-white">
        {/* Abstract shapes / patterns */}
        <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-[10%] right-[10%] w-64 h-64 bg-emerald-500 rounded-full blur-[120px]" />
          <div className="absolute bottom-[10%] left-[10%] w-96 h-96 bg-blue-500 rounded-full blur-[150px]" />
        </div>

        <div className="relative z-10">

          <div className="max-w-md">

          </div>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-8">



        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50 md:bg-white">
        <div className="w-full max-w-sm space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="md:hidden flex justify-center mb-8">
            <div className="flex items-center gap-2">
              <Gavel className="w-8 h-8 text-emerald-600" />
              <span className="text-2xl font-heading font-bold text-slate-900">LicitaFácil</span>
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-heading font-bold text-slate-900">Bem-vindo de volta</h2>
            <p className="text-slate-500 mt-2">Acesse sua conta para gerenciar seus processos.</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-slate-700 font-semibold">E-mail</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="nome@empresa.com.br"
                        {...field}
                        className="h-12 border-slate-200 bg-slate-50/50 focus:bg-white transition-all focus:ring-emerald-500"
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
                      <FormLabel className="text-slate-700 font-semibold">Senha</FormLabel>
                      <button type="button" className="text-xs font-bold text-emerald-600 hover:text-emerald-700 uppercase tracking-wider transition-colors">Esqueceu a senha?</button>
                    </div>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                        className="h-12 border-slate-200 bg-slate-50/50 focus:bg-white transition-all focus:ring-emerald-500"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white h-12 text-base font-bold transition-all shadow-lg active:scale-[0.98]"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Autenticando...
                  </>
                ) : (
                  "Acessar Plataforma"
                )}
              </Button>
            </form>
          </Form>

          <div className="pt-4 text-center">
            <p className="text-sm text-slate-500">
              Ainda não tem acesso? <button className="text-emerald-600 font-bold hover:underline">Entre em contato</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
