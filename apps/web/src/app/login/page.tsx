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
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});
type LoginFormValues = z.infer<typeof loginSchema>;

const forgotSchema = z.object({
  email: z.string().email("Email inválido"),
});
type ForgotFormValues = z.infer<typeof forgotSchema>;

const GridPattern = () => (
  <svg
    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.04, pointerEvents: "none" }}
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.6" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#grid)" />
  </svg>
);

export default function LoginPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
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

  const emailValue = form.watch("email");
  const passwordValue = form.watch("password");
  const handleSubmit = form.handleSubmit(onSubmit);
  const emailField = form.register("email");
  const passwordField = form.register("password");

  return (
    <>
      <div
        style={{
          display: "flex",
          minHeight: "100vh",
          fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
          background: "#ffffff",
        }}
      >
        <div
          style={{
            flex: "0 0 50%",
            position: "relative",
            overflow: "hidden",
            background: "#020B1D",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "48px 56px",
          }}
          className="flex"
        >
          <GridPattern />
          <div
            style={{
              position: "absolute",
              top: "20%",
              left: "20%",
              width: 300,
              height: 300,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(0,120,209,0.12) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />

          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  background: "#0078D1",
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 16px rgba(0,120,209,0.4)",
                }}
              >
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: 15,
                    color: "#fff",
                    fontFamily: "monospace",
                    letterSpacing: "-0.02em",
                  }}
                >
                  LX
                </span>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: "#fff",
                    letterSpacing: "0.06em",
                    lineHeight: 1,
                  }}
                >
                  LIMVEX
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: "rgba(255,255,255,0.4)",
                    letterSpacing: "0.2em",
                    marginTop: 3,
                  }}
                >
                  LICITAÇÃO
                </div>
              </div>
            </div>
          </div>

          <div style={{ position: "relative", zIndex: 1 }}>
            <h1
              style={{
                fontSize: 36,
                fontWeight: 700,
                color: "#fff",
                lineHeight: 1.2,
                letterSpacing: "-0.02em",
                marginBottom: 20,
                maxWidth: 380,
              }}
            >
              Gestão inteligente do ciclo completo de licitações públicas.
            </h1>

            <p
              style={{
                fontSize: 14,
                color: "rgba(255,255,255,0.4)",
                lineHeight: 1.7,
                maxWidth: 360,
                marginBottom: 40,
              }}
            >
              Monitore editais, analise riscos com IA e gerencie
              participações em um único lugar.
            </p>

            <div
              style={{
                width: 40,
                height: 1,
                background: "rgba(255,255,255,0.15)",
                marginBottom: 32,
              }}
            />

          </div>

          <div
            style={{
              position: "relative",
              zIndex: 1,
              fontSize: 11,
              color: "rgba(255,255,255,0.2)",
            }}
          >
            © 2026 Limvex · Todos os direitos reservados
          </div>
        </div>

        <div
          style={{
            flex: 1,
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "48px 56px",
            position: "relative",
          }}
        >
          <div style={{ width: "100%", maxWidth: 380 }}>
            <div style={{ marginBottom: 36 }}>
              <h2
                style={{
                  fontSize: 26,
                  fontWeight: 700,
                  color: "#0a0a0f",
                  letterSpacing: "-0.02em",
                  marginBottom: 8,
                }}
              >
                Bem-vindo de volta
              </h2>
              <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.6 }}>
                Acesse sua conta para gerenciar seus processos.
              </p>
            </div>

            <div
              style={{
                padding: "12px 14px",
                borderRadius: 10,
                marginBottom: 28,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
              }}
            >
              <span style={{ fontSize: 14, marginTop: 1 }}>🔒</span>
              <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6, margin: 0 }}>
                O acesso é concedido pela sua organização.
                Fale com o administrador caso não tenha recebido seu convite.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                    color: "#374151",
                  letterSpacing: "0.04em",
                  display: "block",
                  marginBottom: 7,
                }}
              >
                E-MAIL
              </label>
              <input
                type="email"
                placeholder="nome@empresa.com.br"
                name={emailField.name}
                ref={emailField.ref}
                value={emailValue}
                onChange={(e) => {
                  emailField.onChange(e);
                }}
                onFocus={() => setFocused("email")}
                onBlur={(e) => {
                  emailField.onBlur(e);
                  setFocused(null);
                }}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1.5px solid",
                  borderColor: focused === "email" ? "#0078D1" : "#e5e7eb",
                  background: "#fff",
                  color: "#111827",
                  fontSize: 14,
                  outline: "none",
                  transition: "border-color 0.2s",
                  boxSizing: "border-box",
                }}
              />
              {form.formState.errors.email && (
                <p style={{ marginTop: 6, fontSize: 12, color: "#f87171" }}>
                  {form.formState.errors.email.message}
                </p>
              )}
              </div>

              <div style={{ marginBottom: 28 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 7,
                }}
              >
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#374151",
                    letterSpacing: "0.04em",
                  }}
                >
                  SENHA
                </label>
                <button
                  type="button"
                  onClick={handleForgotOpen}
                  style={{
                    fontSize: 11,
                    color: "#0078D1",
                    fontWeight: 600,
                    textDecoration: "none",
                    letterSpacing: "0.04em",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  ESQUECEU A SENHA?
                </button>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••"
                  name={passwordField.name}
                  ref={passwordField.ref}
                  value={passwordValue}
                  onChange={(e) => {
                    passwordField.onChange(e);
                  }}
                  onFocus={() => setFocused("pass")}
                  onBlur={(e) => {
                    passwordField.onBlur(e);
                    setFocused(null);
                  }}
                  style={{
                    width: "100%",
                    padding: "12px 42px 12px 14px",
                    borderRadius: 10,
                    border: "1.5px solid",
                    borderColor: focused === "pass" ? "#0078D1" : "#e5e7eb",
                    background: "#fff",
                    color: "#111827",
                    fontSize: 14,
                    outline: "none",
                    transition: "border-color 0.2s",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#9ca3af",
                    fontSize: 13,
                  }}
                >
                  {showPassword ? "◉" : "○"}
                </button>
              </div>
              {form.formState.errors.password && (
                <p style={{ marginTop: 6, fontSize: 12, color: "#f87171" }}>
                  {form.formState.errors.password.message}
                </p>
              )}
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: 10,
                  border: "none",
                  background: "#020B1D",
                  color: "#ffffff",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  letterSpacing: "-0.01em",
                  opacity: isSubmitting ? 0.8 : 1,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "#0078D1";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "#020B1D";
                }}
              >
                {isSubmitting ? "Autenticando..." : "Acessar Plataforma"}
              </button>
            </form>

            <p
              style={{
                textAlign: "center",
                marginTop: 24,
                fontSize: 12,
                color: "#9ca3af",
              }}
            >
              Não tem acesso?{" "}
              <a
                href="https://wa.me/5582991709740"
                target="_blank"
                rel="noreferrer"
                style={{
                  color: "#0078D1",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Fale com o suporte
              </a>
            </p>
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
