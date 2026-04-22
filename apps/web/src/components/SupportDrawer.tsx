"use client";

import { useState } from "react";
import {
  X, Search, LayoutGrid, Sparkles, FileText, Users, Globe, ChevronDown, ChevronUp,
} from "lucide-react";
import { Input } from "@/components/ui/input";

const CATEGORIES = [
  { icon: LayoutGrid, label: "Licitações", desc: "Gerencie processos e estado operacional" },
  { icon: Sparkles, label: "Inteligência Artificial", desc: "Análise de editais e predição de sucesso" },
  { icon: Globe, label: "Busca PNCP", desc: "Encontre oportunidades diretamente no PNCP" },
  { icon: FileText, label: "Documentos", desc: "Uploads, checklists e controle de prazos" },
  { icon: Users, label: "Usuários & Acesso", desc: "Gestão de membros e permissões" },
];

const FAQS = [
  { q: "Como adicionar uma nova licitação manualmente?", a: "Acesse Gestão → Licitações e clique em \"+ Nova Licitação\" no canto superior direito." },
  { q: "Como funciona a sincronização com o PNCP?", a: "A sincronização acontece automaticamente a cada hora. Você também pode forçar clicando em \"Sincronizar\" na página de licitações." },
  { q: "O que significa Risco Operacional?", a: "Indica licitações com prazos críticos, documentos vencidos ou pendências que requerem ação imediata." },
  { q: "Como a IA analisa o edital?", a: "Faça upload do PDF do edital e clique em \"Analisar Edital (IA)\". A LicitaAI extrai requisitos, prazos e documentos obrigatórios automaticamente." },
  { q: "Como convidar um novo usuário?", a: "Acesse Admin → Usuários e clique em \"Convidar usuário\". O convite é enviado por email." },
];

interface SupportDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function SupportDrawer({ open, onClose }: SupportDrawerProps) {
  const [search, setSearch] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const filteredFaqs = FAQS.filter((f) =>
    f.q.toLowerCase().includes(search.toLowerCase()) ||
    f.a.toLowerCase().includes(search.toLowerCase()),
  );

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="fixed top-0 right-0 z-50 flex h-full w-full max-w-md flex-col overflow-hidden border-l border-border bg-background text-foreground shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Central de Ajuda
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Como podemos ajudar?
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por tópico ou dúvida..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-input bg-background pl-9 text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {!search && (
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Categorias
              </p>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((cat) => (
                  <div
                    key={cat.label}
                    className="cursor-pointer rounded-xl border border-border bg-card p-3 text-card-foreground transition-colors hover:bg-accent/60"
                  >
                    <cat.icon className="mb-2 h-4 w-4 text-foreground" />
                    <p className="text-xs font-semibold leading-tight">
                      {cat.label}
                    </p>
                    <p className="mt-1 text-[11px] leading-tight text-muted-foreground">
                      {cat.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Perguntas frequentes
            </p>
            <div className="space-y-2">
              {filteredFaqs.map((faq, i) => (
                <div
                  key={faq.q}
                  className="overflow-hidden rounded-xl border border-border bg-card text-card-foreground"
                >
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-4 py-3 text-left"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    <span className="pr-4 text-sm font-medium leading-snug text-foreground">
                      {faq.q}
                    </span>
                    {openFaq === i
                      ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                      : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
                  </button>
                  {openFaq === i && (
                    <div className="border-t border-border px-4 pt-2 pb-3 text-sm leading-relaxed text-muted-foreground">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
              {filteredFaqs.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Nenhum resultado encontrado.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-border px-6 py-4">
          <p className="text-center text-xs text-muted-foreground">
            Não encontrou o que precisava?{" "}
            <a
              href="mailto:comercial@limvex.com"
              className="font-limvex font-medium text-foreground underline-offset-4 hover:underline"
            >
              comercial@limvex.com
            </a>
          </p>
        </div>
      </div>
    </>
  );
}
