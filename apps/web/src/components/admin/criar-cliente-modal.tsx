"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/Card";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Check, Building2, CreditCard, Settings2, UserPlus, ClipboardCheck } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { maskCNPJ, formatCurrency } from "@/lib/utils";

const schema = z.object({
  // Step 1 — Dados da empresa
  nomeEmpresa: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  cnpj: z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, "CNPJ inválido"),
  email: z.string().email("Email inválido"),
  telefone: z.string().optional(),
  responsavelComercial: z.string().optional(),
  // Step 2 — Plano e billing
  plano: z.enum(["STARTER", "PROFESSIONAL", "ENTERPRISE"]),
  valorSetup: z.coerce.number().min(0, "Valor deve ser positivo"),
  mensalidade: z.coerce.number().min(0, "Valor deve ser positivo"),
  dataInicio: z.string().min(1, "Data de início é obrigatória"),
  // Step 3 — Limites (opcionais; .catch(undefined) trata NaN de inputs vazios)
  maxUsuarios: z.coerce.number().min(1).optional().catch(undefined),
  maxStorageGB: z.coerce.number().min(1).optional().catch(undefined),
  maxLicitacoesMes: z.coerce.number().min(1).optional().catch(undefined),
  // Step 4 — Admin
  nomeAdmin: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  emailAdmin: z.string().email("Email inválido"),
});

type FormData = z.infer<typeof schema>;

interface Props {
  aberto: boolean;
  onFechar: () => void;
  onSucesso: () => void;
}

const STEPS = [
  { numero: 1, titulo: "Empresa", icon: Building2 },
  { numero: 2, titulo: "Plano", icon: CreditCard },
  { numero: 3, titulo: "Limites", icon: Settings2 },
  { numero: 4, titulo: "Admin", icon: UserPlus },
  { numero: 5, titulo: "Revisão", icon: ClipboardCheck },
];

const PLANOS = {
  STARTER: {
    label: "Starter",
    descricao: "Ideal para empresas iniciando em licitações",
    setupPadrao: 5000,
    mensalidadePadrao: 1500,
    limites: { usuarios: 10, storage: 10, licitacoes: 50 },
  },
  PROFESSIONAL: {
    label: "Professional",
    descricao: "Para empresas com volume médio de licitações",
    setupPadrao: 10000,
    mensalidadePadrao: 3000,
    limites: { usuarios: 30, storage: 50, licitacoes: "Ilimitado" },
  },
  ENTERPRISE: {
    label: "Enterprise",
    descricao: "Para grandes operações com necessidades avançadas",
    setupPadrao: 15000,
    mensalidadePadrao: 5000,
    limites: { usuarios: "Ilimitado", storage: "Ilimitado", licitacoes: "Ilimitado" },
  },
} as const;

export function CriarClienteModal({ aberto, onFechar, onSucesso }: Props) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const {
    register,
    watch,
    setValue,
    getValues,
    trigger,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: {
      dataInicio: new Date().toISOString().split("T")[0],
      plano: "PROFESSIONAL",
      valorSetup: 10000,
      mensalidade: 3000,
    },
  });

  const planoSelecionado = watch("plano") as keyof typeof PLANOS;

  const handlePlanoChange = (plano: keyof typeof PLANOS) => {
    setValue("plano", plano);
    setValue("valorSetup", PLANOS[plano].setupPadrao);
    setValue("mensalidade", PLANOS[plano].mensalidadePadrao);
  };

  // Submit manual — evita problemas de handleSubmit com multi-step forms
  const handleCriarCliente = async () => {
    // Validar todos os campos antes de enviar
    const valid = await trigger();
    if (!valid) {
      // Encontrar em qual step está o primeiro erro e navegar até lá
      const errorFields = Object.keys(errors) as (keyof FormData)[];
      if (errorFields.length > 0) {
        const step1Fields = ["nomeEmpresa", "cnpj", "email", "telefone", "responsavelComercial"];
        const step2Fields = ["plano", "valorSetup", "mensalidade", "dataInicio"];
        const step4Fields = ["nomeAdmin", "emailAdmin"];

        if (errorFields.some((f) => step1Fields.includes(f))) setStep(1);
        else if (errorFields.some((f) => step2Fields.includes(f))) setStep(2);
        else if (errorFields.some((f) => step4Fields.includes(f))) setStep(4);
      }

      toast({
        title: "Dados incompletos",
        description: "Verifique os campos obrigatórios em destaque",
        variant: "destructive",
      });
      return;
    }

    const data = getValues();
    setLoading(true);
    try {
      await api.post("/admin/clientes", data);
      toast({
        title: "Cliente criado com sucesso!",
        description: `Email de boas-vindas enviado para ${data.emailAdmin}`,
      });
      reset();
      setStep(1);
      onSucesso();
    } catch (error: any) {
      toast({
        title: "Erro ao criar cliente",
        description: error.response?.data?.message || "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    setStep(1);
    onFechar();
  };

  // Validar campos do step atual antes de avançar
  const proximoStep = async () => {
    let fieldsToValidate: (keyof FormData)[] = [];

    switch (step) {
      case 1:
        fieldsToValidate = ["nomeEmpresa", "cnpj", "email"];
        break;
      case 2:
        fieldsToValidate = ["plano", "valorSetup", "mensalidade", "dataInicio"];
        break;
      case 3:
        // Limites são opcionais, sem validação obrigatória
        break;
      case 4:
        fieldsToValidate = ["nomeAdmin", "emailAdmin"];
        break;
    }

    if (fieldsToValidate.length > 0) {
      const valid = await trigger(fieldsToValidate);
      if (!valid) return;
    }

    setStep((prev) => Math.min(prev + 1, 5));
  };

  const voltarStep = () => setStep((prev) => Math.max(prev - 1, 1));

  const progressoPercentual = (step / 5) * 100;

  return (
    <Dialog open={aberto} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Criar Novo Cliente B2B</DialogTitle>
          <DialogDescription>
            Wizard de onboarding em 5 etapas. Preencha todos os dados para criar a conta.
          </DialogDescription>
        </DialogHeader>

        {/* Progresso */}
        <div className="space-y-3">
          <div className="flex justify-between text-xs">
            {STEPS.map((s) => {
              const Icon = s.icon;
              const isActive = s.numero === step;
              const isCompleted = s.numero < step;
              return (
                <div
                  key={s.numero}
                  className={`flex items-center gap-1 font-medium transition-colors ${
                    isActive
                      ? "text-primary"
                      : isCompleted
                        ? "text-green-600"
                        : "text-muted-foreground"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Icon className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline">{s.titulo}</span>
                </div>
              );
            })}
          </div>
          <Progress value={progressoPercentual} />
        </div>

        <div className="space-y-6">
          {/* Step 1: Dados da Empresa */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="nomeEmpresa">Nome da Empresa *</Label>
                <Input
                  id="nomeEmpresa"
                  {...register("nomeEmpresa")}
                  placeholder="Ex: Construtora ABC LTDA"
                  className="mt-1"
                />
                {errors.nomeEmpresa && (
                  <p className="text-sm text-red-500 mt-1">{errors.nomeEmpresa.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="cnpj">CNPJ *</Label>
                <Input
                  id="cnpj"
                  value={watch("cnpj") || ""}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                  className="mt-1"
                  onChange={(e) => {
                    const formatted = maskCNPJ(e.target.value);
                    setValue("cnpj", formatted, { shouldValidate: false });
                  }}
                />
                {errors.cnpj && (
                  <p className="text-sm text-red-500 mt-1">{errors.cnpj.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="email">Email Comercial *</Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  placeholder="contato@empresa.com.br"
                  className="mt-1"
                />
                {errors.email && (
                  <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  {...register("telefone")}
                  placeholder="(11) 99999-9999"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="responsavelComercial">Responsável Comercial (SDR)</Label>
                <Input
                  id="responsavelComercial"
                  {...register("responsavelComercial")}
                  placeholder="Nome do SDR que fechou a venda"
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {/* Step 2: Plano e Cobrança */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label>Plano *</Label>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  {(Object.entries(PLANOS) as [keyof typeof PLANOS, (typeof PLANOS)[keyof typeof PLANOS]][]).map(
                    ([key, plano]) => (
                      <Card
                        key={key}
                        className={`p-4 cursor-pointer border-2 transition-all hover:shadow-md ${
                          planoSelecionado === key
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-muted hover:border-muted-foreground/30"
                        }`}
                        onClick={() => handlePlanoChange(key)}
                      >
                        <h4 className="font-semibold text-center">{plano.label}</h4>
                        <p className="text-xs text-muted-foreground text-center mt-1">
                          {plano.descricao}
                        </p>
                        <div className="mt-3 space-y-1 text-center">
                          <p className="text-sm">
                            Setup:{" "}
                            <span className="font-semibold">
                              {formatCurrency(plano.setupPadrao)}
                            </span>
                          </p>
                          <p className="text-sm">
                            Mensal:{" "}
                            <span className="font-semibold">
                              {formatCurrency(plano.mensalidadePadrao)}
                            </span>
                          </p>
                        </div>
                      </Card>
                    ),
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="valorSetup">Valor Setup (R$) *</Label>
                  <Input
                    id="valorSetup"
                    type="number"
                    step="0.01"
                    {...register("valorSetup")}
                    className="mt-1"
                  />
                  {errors.valorSetup && (
                    <p className="text-sm text-red-500 mt-1">{errors.valorSetup.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="mensalidade">Mensalidade (R$) *</Label>
                  <Input
                    id="mensalidade"
                    type="number"
                    step="0.01"
                    {...register("mensalidade")}
                    className="mt-1"
                  />
                  {errors.mensalidade && (
                    <p className="text-sm text-red-500 mt-1">{errors.mensalidade.message}</p>
                  )}
                </div>
              </div>
              <div>
                <Label htmlFor="dataInicio">Data de Início *</Label>
                <Input id="dataInicio" type="date" {...register("dataInicio")} className="mt-1" />
                {errors.dataInicio && (
                  <p className="text-sm text-red-500 mt-1">{errors.dataInicio.message}</p>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Limites */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Limites padrão baseados no plano <strong>{PLANOS[planoSelecionado]?.label}</strong>.
                Personalize apenas se necessário.
              </p>
              <div>
                <Label htmlFor="maxUsuarios">
                  Máximo de Usuários{" "}
                  <span className="text-muted-foreground">
                    (padrão: {PLANOS[planoSelecionado]?.limites.usuarios})
                  </span>
                </Label>
                <Input
                  id="maxUsuarios"
                  type="number"
                  {...register("maxUsuarios")}
                  placeholder={String(PLANOS[planoSelecionado]?.limites.usuarios)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="maxStorageGB">
                  Storage (GB){" "}
                  <span className="text-muted-foreground">
                    (padrão: {PLANOS[planoSelecionado]?.limites.storage})
                  </span>
                </Label>
                <Input
                  id="maxStorageGB"
                  type="number"
                  {...register("maxStorageGB")}
                  placeholder={String(PLANOS[planoSelecionado]?.limites.storage)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="maxLicitacoesMes">
                  Licitações/Mês{" "}
                  <span className="text-muted-foreground">
                    (padrão: {PLANOS[planoSelecionado]?.limites.licitacoes})
                  </span>
                </Label>
                <Input
                  id="maxLicitacoesMes"
                  type="number"
                  {...register("maxLicitacoesMes")}
                  placeholder={String(PLANOS[planoSelecionado]?.limites.licitacoes)}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {/* Step 4: Admin */}
          {step === 4 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Crie o usuário administrador inicial do cliente. Uma senha temporária será gerada
                automaticamente e enviada por email.
              </p>
              <div>
                <Label htmlFor="nomeAdmin">Nome Completo *</Label>
                <Input
                  id="nomeAdmin"
                  {...register("nomeAdmin")}
                  placeholder="João da Silva"
                  className="mt-1"
                />
                {errors.nomeAdmin && (
                  <p className="text-sm text-red-500 mt-1">{errors.nomeAdmin.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="emailAdmin">Email do Administrador *</Label>
                <Input
                  id="emailAdmin"
                  type="email"
                  {...register("emailAdmin")}
                  placeholder="joao@empresa.com.br"
                  className="mt-1"
                />
                {errors.emailAdmin && (
                  <p className="text-sm text-red-500 mt-1">{errors.emailAdmin.message}</p>
                )}
              </div>
            </div>
          )}

          {/* Step 5: Revisão */}
          {step === 5 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Revisão Final</h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm border rounded-lg p-4">
                <div>
                  <p className="text-muted-foreground">Empresa</p>
                  <p className="font-medium">{watch("nomeEmpresa")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">CNPJ</p>
                  <p className="font-medium font-mono">{watch("cnpj")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email Comercial</p>
                  <p className="font-medium">{watch("email")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Plano</p>
                  <p className="font-medium">{PLANOS[watch("plano") as keyof typeof PLANOS]?.label}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Valor Setup</p>
                  <p className="font-medium">{formatCurrency(watch("valorSetup") || 0)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Mensalidade</p>
                  <p className="font-medium">{formatCurrency(watch("mensalidade") || 0)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Data de Início</p>
                  <p className="font-medium">{watch("dataInicio")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Admin</p>
                  <p className="font-medium">{watch("nomeAdmin")}</p>
                  <p className="text-xs text-muted-foreground">{watch("emailAdmin")}</p>
                </div>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Ao confirmar, o cliente será criado e um email com credenciais de acesso será
                  enviado para <strong>{watch("emailAdmin")}</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Navegação */}
          <div className="flex justify-between pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={step === 1 ? handleClose : voltarStep}
              disabled={loading}
            >
              {step === 1 ? (
                "Cancelar"
              ) : (
                <>
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Voltar
                </>
              )}
            </Button>
            {step < 5 ? (
              <Button type="button" onClick={proximoStep}>
                Próximo
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button type="button" onClick={handleCriarCliente} disabled={loading}>
                {loading ? "Criando..." : "Criar Cliente"}
                <Check className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
