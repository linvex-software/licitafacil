"use client";

import { useState } from "react";
import {
  X, Search, LayoutGrid, Sparkles, FileText, Users, Globe, ChevronDown, ChevronUp,
} from "lucide-react";

const CATEGORIES = [
  { icon: LayoutGrid, label: "Licitações", desc: "Gerencie processos e estado operacional", color: "#0078D1" },
  { icon: Sparkles, label: "Inteligência Artificial", desc: "Análise de editais e predição de sucesso", color: "#8b5cf6" },
  { icon: Globe, label: "Busca PNCP", desc: "Encontre oportunidades diretamente no PNCP", color: "#06b6d4" },
  { icon: FileText, label: "Documentos", desc: "Uploads, checklists e controle de prazos", color: "#f59e0b" },
  { icon: Users, label: "Usuários & Acesso", desc: "Gestão de membros e permissões", color: "#22c55e" },
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
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="fixed top-0 right-0 z-50 flex h-full w-full max-w-md flex-col overflow-hidden border-l border-gray-100 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-950">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5 dark:border-gray-800">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Central de Ajuda
            </h2>
            <p className="mt-0.5 text-xs text-gray-400">
              Como podemos ajudar?
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por tópico ou dúvida..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-4 text-sm text-gray-800 placeholder-gray-400 transition-colors focus:border-[#0078D1]/50 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:placeholder-gray-500"
            />
          </div>

          {!search && (
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Categorias
              </p>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((cat) => (
                  <div
                    key={cat.label}
                    className="cursor-pointer rounded-xl border border-gray-100 bg-white p-3 transition-colors hover:border-gray-200 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
                  >
                    <cat.icon
                      className="mb-2 h-4 w-4"
                      style={{ color: cat.color }}
                    />
                    <p className="text-xs font-semibold leading-tight text-gray-700 dark:text-gray-300">
                      {cat.label}
                    </p>
                    <p className="mt-1 text-[11px] leading-tight text-gray-400 dark:text-gray-500">
                      {cat.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Perguntas frequentes
            </p>
            <div className="space-y-2">
              {filteredFaqs.map((faq, i) => (
                <div
                  key={faq.q}
                  className="overflow-hidden rounded-xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900"
                >
                  <button
                    className="flex w-full items-center justify-between px-4 py-3 text-left"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    <span className="pr-4 text-sm font-medium leading-snug text-gray-700 dark:text-gray-300">
                      {faq.q}
                    </span>
                    {openFaq === i
                      ? <ChevronUp className="h-4 w-4 shrink-0 text-gray-400" />
                      : <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />}
                  </button>
                  {openFaq === i && (
                    <div className="border-t border-gray-50 px-4 pt-2 pb-3 text-sm leading-relaxed text-gray-500 dark:border-gray-800 dark:text-gray-400">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
              {filteredFaqs.length === 0 && (
                <p className="py-6 text-center text-sm text-gray-400">
                  Nenhum resultado encontrado.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 px-6 py-4 dark:border-gray-800">
          <p className="text-center text-xs text-gray-400">
            Não encontrou o que precisava?{" "}
            <a href="mailto:suporte@limvex.com" className="font-medium text-[#0078D1] hover:underline">
              Fale conosco
            </a>
          </p>
        </div>
      </div>
    </>
  );
}
