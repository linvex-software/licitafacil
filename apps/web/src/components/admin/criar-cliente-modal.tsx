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
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Check, Building2, CreditCard, UserPlus, ClipboardCheck } from "lucide-react";
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
  // Step 2 — Billing (plano fixo ENTERPRISE)
  plano: z.enum(["STARTER", "PROFESSIONAL", "ENTERPRISE"]),
  valorSetup: z.coerce.number().min(0, "Valor deve ser positivo"),
  mensalidade: z.coerce.number().min(0, "Valor deve ser positivo"),
  dataInicio: z.string().min(1, "Data de início é obrigatória"),
  // Step 3 — Admin
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
  { numero: 2, titulo: "Cobrança", icon: CreditCard },
  { numero: 3, titulo: "Admin", icon: UserPlus },
  { numero: 4, titulo: "Revisão", icon: ClipboardCheck },
];

const TOTAL_STEPS = STEPS.length;

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
      plano: "ENTERPRISE",
      valorSetup: 15000,
      mensalidade: 5000,
    },
  });

  // Submit manual — evita problemas de handleSubmit com multi-step forms
  const handleCriarCliente = async () => {
    const valid = await trigger();
    if (!valid) {
      const errorFields = Object.keys(errors) as (keyof FormData)[];
      if (errorFields.length > 0) {
        const step1Fields = ["nomeEmpresa", "cnpj", "email", "telefone", "responsavelComercial"];
        const step2Fields = ["plano", "valorSetup", "mensalidade", "dataInicio"];
        const step3Fields = ["nomeAdmin", "emailAdmin"];

        if (errorFields.some((f) => step1Fields.includes(f))) setStep(1);
        else if (errorFields.some((f) => step2Fields.includes(f))) setStep(2);
        else if (errorFields.some((f) => step3Fields.includes(f))) setStep(3);
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

  const proximoStep = async () => {
    let fieldsToValidate: (keyof FormData)[] = [];

    switch (step) {
      case 1:
        fieldsToValidate = ["nomeEmpresa", "cnpj", "email"];
        break;
      case 2:
        fieldsToValidate = ["valorSetup", "mensalidade", "dataInicio"];
        break;
      case 3:
        fieldsToValidate = ["nomeAdmin", "emailAdmin"];
        break;
    }

    if (fieldsToValidate.length > 0) {
      const valid = await trigger(fieldsToValidate);
      if (!valid) return;
    }

    setStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
  };

  const voltarStep = () => setStep((prev) => Math.max(prev - 1, 1));

  const progressoPercentual = (step / TOTAL_STEPS) * 100;

  return (
    <Dialog open={aberto} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Criar Novo Cliente</DialogTitle>
          <DialogDescription>
            Wizard de onboarding em {TOTAL_STEPS} etapas. Preencha todos os dados para criar a conta.
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

          {/* Step 2: Cobrança */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Configure os valores de setup e mensalidade para o cliente. Todos os recursos são ilimitados.
              </p>
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

          {/* Step 3: Admin */}
          {step === 3 && (
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

          {/* Step 4: Revisão */}
          {step === 4 && (
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
                  <p className="text-muted-foreground">Recursos</p>
                  <p className="font-medium">Ilimitados</p>
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
            {step < TOTAL_STEPS ? (
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
