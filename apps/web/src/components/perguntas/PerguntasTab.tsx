"use client";

import { useEffect, useRef, useState } from "react";
import { FileX, Send } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { chatComEdital, getChatHistorico, type ChatMensagem } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface PerguntasTabProps {
  bidId?: string;
  emModal?: boolean;
}

interface PerguntaRapida {
  label: string;
  pergunta: string;
}

const PERGUNTAS_RAPIDAS: PerguntaRapida[] = [
  {
    label: "Qual o objeto?",
    pergunta:
      "Qual é o objeto desta licitação? Descreva de forma resumida o que está sendo contratado.",
  },
  {
    label: "Quando é a abertura?",
    pergunta:
      "Qual é a data e horário de abertura da sessão pública desta licitação?",
  },
  {
    label: "Quais os pré-requisitos?",
    pergunta:
      "Quais são os pré-requisitos e requisitos de habilitação exigidos para participar desta licitação?",
  },
  {
    label: "Documentação necessária?",
    pergunta:
      "Quais documentos são necessários para a habilitação nesta licitação?",
  },
  {
    label: "Valor estimado?",
    pergunta: "Qual é o valor estimado ou referência desta licitação?",
  },
  {
    label: "ME/EPP têm preferência?",
    pergunta:
      "Há benefícios ou preferências para microempresas (ME) e empresas de pequeno porte (EPP) nesta licitação?",
  },
  {
    label: "Prazo do contrato?",
    pergunta: "Qual é o prazo de vigência do contrato a ser firmado?",
  },
  {
    label: "Exige garantia?",
    pergunta:
      "Há exigência de garantia de proposta ou de execução contratual? Se sim, qual o percentual e modalidades aceitas?",
  },
  {
    label: "Sanções previstas?",
    pergunta:
      "Quais são as sanções e penalidades previstas em caso de descumprimento contratual?",
  },
];

export function PerguntasTab({ bidId: bidIdProp, emModal = false }: PerguntasTabProps) {
  const params = useParams<{ id?: string }>();
  const bidId = bidIdProp || params?.id || "";
  const router = useRouter();
  const { toast } = useToast();

  const [historico, setHistorico] = useState<ChatMensagem[]>([]);
  const [pergunta, setPergunta] = useState("");
  const [isLoadingHistorico, setIsLoadingHistorico] = useState(true);
  const [isRespondendo, setIsRespondendo] = useState(false);
  const [semAnalise, setSemAnalise] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!bidId) {
      setIsLoadingHistorico(false);
      return;
    }

    const carregarHistorico = async () => {
      setIsLoadingHistorico(true);
      try {
        const data = await getChatHistorico(bidId);
        setHistorico(data);
      } catch (error: any) {
        const apiMessage = error?.response?.data?.message;
        if (apiMessage === "ANALISE_NAO_ENCONTRADA") {
          setSemAnalise(true);
          return;
        }

        toast({
          title: "Erro ao carregar histórico",
          description:
            apiMessage ||
            "Não foi possível carregar as mensagens do chat neste momento.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingHistorico(false);
      }
    };

    void carregarHistorico();
  }, [bidId, toast]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [historico, isRespondendo, semAnalise]);

  const ajustarAlturaTextarea = () => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${Math.min(
      textareaRef.current.scrollHeight,
      120,
    )}px`;
  };

  const handleEnviarPergunta = async (textoPergunta?: string) => {
    const perguntaFinal = (textoPergunta ?? pergunta).trim();
    if (!bidId) {
      toast({
        title: "Licitação não identificada",
        description: "Não foi possível identificar a licitação para enviar a pergunta.",
        variant: "destructive",
      });
      return;
    }

    if (perguntaFinal.length < 3 || isRespondendo || semAnalise) {
      return;
    }

    setIsRespondendo(true);
    try {
      // Delay mínimo para exibir animação de "pensando" sem atrasar respostas lentas.
      const [respostaReal] = await Promise.all([
        chatComEdital(bidId, perguntaFinal),
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ]);

      setHistorico((prev) => [
        ...prev,
        {
          id: `temp-${Date.now()}`,
          pergunta: respostaReal.pergunta,
          resposta: respostaReal.resposta,
          createdAt: respostaReal.createdAt,
        },
      ]);
      setPergunta("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "44px";
      }
    } catch (error: any) {
      const apiMessage = error?.response?.data?.message;
      if (apiMessage === "ANALISE_NAO_ENCONTRADA") {
        setSemAnalise(true);
        return;
      }

      toast({
        title: "Erro ao perguntar",
        description:
          apiMessage ||
          "Não foi possível processar sua pergunta agora. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsRespondendo(false);
    }
  };

  const handlePerguntaRapida = async (item: PerguntaRapida) => {
    setPergunta(item.pergunta);
    await handleEnviarPergunta(item.pergunta);
  };

  return (
    <div
      className={cn(
        "flex flex-col border border-border rounded-2xl overflow-hidden bg-background",
        emModal ? "h-full min-h-[420px]" : "h-[calc(100vh-120px)]",
      )}
    >
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
          L
        </div>
        <div>
          <p className="font-semibold text-sm">LicitaIA</p>
          <p className="text-xs text-muted-foreground">
            Assistente especializado em editais
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-foreground" />
          <span className="text-xs text-muted-foreground">Online</span>
        </div>
      </div>

      <div className="flex gap-2 p-3 border-b border-border overflow-x-auto">
        {PERGUNTAS_RAPIDAS.map((item) => (
          <button
            key={item.label}
            onClick={() => void handlePerguntaRapida(item)}
            disabled={isRespondendo || semAnalise}
            className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-accent hover:border-primary transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {semAnalise ? (
          <div className="h-full flex flex-col items-center justify-center gap-4 text-center p-8">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <FileX className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold">Edital não analisado</p>
              <p className="text-sm text-muted-foreground mt-1">
                Para usar o LicitaIA, primeiro analise o edital desta licitação.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => router.push(`/licitacoes/${bidId}`)}
              className="shadow-none dark:hover:bg-[#e0e0e0]"
            >
              Ir para análise do edital
            </Button>
          </div>
        ) : (
          <>
            {isLoadingHistorico ? (
              <p className="text-sm text-muted-foreground">
                Carregando mensagens...
              </p>
            ) : historico.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Faça uma pergunta para começar a conversa com o LicitaIA.
              </p>
            ) : (
              historico.map((mensagem) => (
                <div key={mensagem.id}>
                  <div className="flex justify-end mb-4">
                    <div className="max-w-[75%]">
                      <div className="rounded-2xl rounded-tr-sm bg-primary px-4 py-3 text-sm leading-relaxed text-primary-foreground whitespace-pre-wrap">
                        {mensagem.pergunta}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 text-right">
                        Você
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 mb-4">
                    <div className="mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      L
                    </div>
                    <div className="max-w-[75%]">
                      <p className="text-xs text-muted-foreground mb-1">
                        LicitaIA
                      </p>
                      <div className="bg-muted px-4 py-3 rounded-2xl rounded-tl-sm text-sm leading-relaxed whitespace-pre-wrap">
                        {mensagem.resposta}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        ⚠️ Baseado na análise automática. Confirme no documento
                        original.
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}

            {isRespondendo && (
              <div className="flex gap-3 mb-4">
                <div className="mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  L
                </div>
                <div className="bg-muted px-4 py-3 rounded-2xl rounded-tl-sm">
                  <div className="flex items-center gap-1">
                    <div
                      className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    ></div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    LicitaIA está pensando...
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-border p-4">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={pergunta}
            onChange={(event) => {
              setPergunta(event.target.value);
              ajustarAlturaTextarea();
            }}
            disabled={isRespondendo || semAnalise}
            className="pointer-events-auto min-h-[44px] max-h-[120px] flex-1 resize-none rounded-xl border border-transparent bg-muted px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Pergunte sobre o edital..."
            rows={1}
          />
          <Button
            type="button"
            onClick={() => void handleEnviarPergunta()}
            disabled={isRespondendo || semAnalise || pergunta.trim().length < 3}
            className="h-auto rounded-xl px-4 py-3 shadow-none dark:hover:bg-[#e0e0e0]"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          ✦ LicitaAI pode cometer erros. Confirme as informações no edital original.
        </p>
      </div>
    </div>
  );
}
