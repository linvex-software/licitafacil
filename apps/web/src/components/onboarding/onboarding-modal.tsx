"use client"

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

// ─── Constants ───────────────────────────────────────────────────────────────

const TOTAL_STEPS = 9;

// ─── Step definitions ─────────────────────────────────────────────────────────

interface StepConfig {
  icon: string;
  title: string;
  subtitle?: string;
  bullets?: string[];
  isLast?: boolean;
}

const STEPS: StepConfig[] = [
  {
    icon: "🎯",
    title: "Bem-vindo ao Limvex Licitação",
    subtitle:
      "A plataforma inteligente para empresas que participam de licitações públicas.",
    bullets: [
      "Monitore pregões em tempo real de múltiplos portais públicos",
      "Gerencie licitações com documentos, checklists e prazos",
      "Use IA para analisar editais e tomar decisões mais rápidas",
    ],
  },
  {
    icon: "📡",
    title: "Monitore pregões em tempo real",
    subtitle:
      "Acompanhe todos os pregões do dia em múltiplos portais (PNCP, ComprasNet, BNC) em uma única tela.",
    bullets: [
      "Filtros por portal, estado e palavra-chave",
      "Countdown regressivo para cada pregão",
      "Alertas automáticos por email antes do pregão iniciar",
    ],
  },
  {
    icon: "📋",
    title: "Gerencie suas licitações",
    subtitle:
      "Cadastre e acompanhe todas as licitações que sua empresa participa. Cada licitação tem sua central completa.",
    bullets: [
      "Dados completos: modalidade, órgão, número, valor estimado",
      "Histórico de alterações e status em tempo real",
      "Acesso rápido a documentos, prazos e checklists",
    ],
  },
  {
    icon: "📄",
    title: "Documentos e checklists organizados",
    subtitle:
      "Centralize todos os documentos da empresa e nunca perca um item obrigatório de habilitação.",
    bullets: [
      "Biblioteca de documentos com controle de validade e versionamento",
      "Checklists por modalidade (Pregão, Concorrência, Tomada de Preços)",
      "Alertas automáticos de documentos vencendo",
    ],
  },
  {
    icon: "⏰",
    title: "Nunca perca um prazo",
    subtitle:
      "Controle de prazos críticos com identificação automática de risco para cada licitação.",
    bullets: [
      "Cadastro de prazos com dias restantes em tempo real",
      'Status "Em Risco" quando algo está atrasado',
      "Notificações por email para prazos críticos",
    ],
  },
  {
    icon: "🤖",
    title: "Inteligência artificial no edital",
    subtitle:
      "Faça upload do edital e deixe a IA fazer o trabalho pesado de análise.",
    bullets: [
      "Análise automática de requisitos, riscos e pontos críticos",
      "Chat com o edital — faça perguntas em linguagem natural",
      "Score de probabilidade de vitória baseado em dados históricos",
    ],
  },
  {
    icon: "⚖️",
    title: "Módulo jurídico integrado",
    subtitle:
      "Gere petições e documentos jurídicos diretamente dentro de cada licitação.",
    bullets: [
      "Geração automática de impugnações e recursos",
      "Histórico completo de petições por licitação",
      "Acompanhamento do status de cada documento jurídico",
    ],
  },
  {
    icon: "📊",
    title: "Inteligência competitiva e pipeline",
    subtitle:
      "Visualize seu pipeline de negócios e pesquise quem está ganhando contratos nos órgãos que você quer vender.",
    bullets: [
      "Funil Kanban com todas as licitações por status",
      "Analytics de concorrência — veja quem ganha em cada órgão comprador",
      "Calculadora de lance integrada em cada licitação",
    ],
  },
  {
    icon: "🚀",
    title: "Tudo pronto! Vamos começar.",
    subtitle:
      "Você conheceu as principais funcionalidades. Por onde quer começar?",
    isLast: true,
  },
];

// ─── Progress bar ─────────────────────────────────────────────────────────────

function StepProgress({ current, total }: { current: number; total: number }) {
  return (
    <div className="space-y-2 mb-6">
      <div className="flex gap-1">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-all duration-300",
              i <= current
                ? "bg-primary"
                : "bg-gray-100 dark:bg-gray-800"
            )}
          />
        ))}
      </div>
      <p className="text-[11px] text-gray-400 dark:text-gray-600 text-right">
        Passo {current + 1} de {total}
      </p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface OnboardingModalProps {
  forceOpen?: boolean;
  onForceClose?: () => void;
}

export function OnboardingModal({ forceOpen, onForceClose }: OnboardingModalProps) {
  const { user, markOnboardingComplete } = useAuth();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user && user.onboardingConcluido === false) {
      setOpen(true);
    }
  }, [user]);

  useEffect(() => {
    if (forceOpen) {
      setStep(0);
      setVisible(true);
      setOpen(true);
    }
  }, [forceOpen]);

  const goToStep = (next: number) => {
    setVisible(false);
    setTimeout(() => {
      setStep(next);
      setVisible(true);
    }, 150);
  };

  const handleSkip = async () => {
    try {
      await api.patch("/users/onboarding-concluido");
    } catch {
      // Falha silenciosa — não bloquear o usuário
    }
    markOnboardingComplete();
    setOpen(false);
    onForceClose?.();
  };

  const handleNext = () => {
    goToStep(step + 1);
  };

  const handleActionCard = async (href: string) => {
    setIsLoading(true);
    try {
      await api.patch("/users/onboarding-concluido");
    } catch {
      // Falha silenciosa
    }
    markOnboardingComplete();
    setOpen(false);
    onForceClose?.();
    router.push(href);
  };

  const currentStep = STEPS[step];
  const isLast = step === TOTAL_STEPS - 1;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="max-w-2xl w-full border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-0 overflow-hidden [&>button]:hidden"
      >
        {/* Acessibilidade */}
        <DialogTitle className="sr-only">
          Onboarding — {currentStep.title}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Guia de introdução à plataforma Limvex Licitação
        </DialogDescription>

        {/* Conteúdo principal */}
        <div className="p-6 sm:p-8 pb-4">
          <StepProgress current={step} total={TOTAL_STEPS} />

          <div
            className={cn(
              "transition-all duration-150",
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
            )}
          >
            {/* Ícone */}
            <div className="text-5xl text-center mb-5">{currentStep.icon}</div>

            {/* Título */}
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 text-center mb-2">
              {currentStep.title}
            </h2>

            {/* Subtítulo */}
            {currentStep.subtitle && (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center leading-relaxed mb-4">
                {currentStep.subtitle}
              </p>
            )}

            {/* Bullets */}
            {currentStep.bullets && (
              <ul className="space-y-2.5 mt-4">
                {currentStep.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-green-500 dark:text-green-400 shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {bullet}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {/* Passo 9: Cards de ação rápida */}
            {currentStep.isLast && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
                {[
                  {
                    label: "Ver pregões de hoje",
                    icon: "📡",
                    href: "/monitoramento",
                  },
                  {
                    label: "Cadastrar licitação",
                    icon: "📋",
                    href: "/licitacoes",
                  },
                  {
                    label: "Explorar o sistema",
                    icon: "🗺️",
                    href: "/",
                  },
                ].map(({ label, icon, href }) => (
                  <button
                    key={href}
                    onClick={() => handleActionCard(href)}
                    disabled={isLoading}
                    className="flex flex-col items-center gap-2.5 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/10 transition-all duration-150 text-sm font-medium text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-center"
                  >
                    <span className="text-2xl">{icon}</span>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Rodapé */}
        <div className="px-6 sm:px-8 py-4 flex items-center justify-between border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={handleSkip}
            className="text-xs text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
          >
            Pular onboarding
          </button>

          {!isLast && (
            <Button onClick={handleNext} size="sm" className="min-w-[100px]">
              Próximo →
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
