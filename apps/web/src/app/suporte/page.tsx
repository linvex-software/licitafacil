"use client";

import {
    ArrowLeft,
    FileText,
    LayoutGrid,
    Mail,
    MessageCircle,
    Search,
    Sparkles,
    Users,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

const categories = [
    {
        title: "Licitações",
        description: "Gerencie processos, funil kanban e estado operacional",
        borderColor: "#000",
        icon: LayoutGrid,
    },
    {
        title: "Inteligência Artificial",
        description: "Análise de editais, predição de sucesso e chat IA",
        borderColor: "#6366f1",
        icon: Sparkles,
    },
    {
        title: "Busca PNCP",
        description: "Encontre oportunidades diretamente pelo PNCP",
        borderColor: "#0ea5e9",
        icon: Search,
    },
    {
        title: "Documentos",
        description: "Uploads, checklists e controle de prazos",
        borderColor: "#f59e0b",
        icon: FileText,
    },
    {
        title: "Usuários & Acesso",
        description: "Gestão de membros, permissões e convites",
        borderColor: "#22c55e",
        icon: Users,
    },
];

const faqItems = [
    {
        id: "faq-1",
        question: "Como adicionar uma nova licitação manualmente?",
        answer:
            "Na tela de licitações, clique em 'Novo Processo', preencha os dados obrigatórios e finalize o cadastro. O processo entra imediatamente no funil para acompanhamento.",
    },
    {
        id: "faq-2",
        question: "Como funciona a sincronização com o PNCP?",
        answer:
            "A busca integra com o PNCP e retorna editais com base nos filtros aplicados. Para resultados mais precisos, use palavras-chave e período de datas no mesmo fluxo.",
    },
    {
        id: "faq-3",
        question: "O que significa 'Risco Operacional'?",
        answer:
            "É um indicador de atenção para pendências críticas, inconsistências ou riscos nos prazos e documentos. Quando marcado, o processo exige revisão da equipe.",
    },
    {
        id: "faq-4",
        question: "Como a IA analisa o edital?",
        answer:
            "A IA processa o conteúdo do PDF, identifica regras, prazos e requisitos, e gera apoio para checklist, análise e predição. O resultado deve ser validado pela equipe responsável.",
    },
    {
        id: "faq-5",
        question: "Como convidar um novo usuário?",
        answer:
            "Acesse o módulo de usuários, selecione a opção de convite, informe o e-mail e defina o nível de acesso. O usuário recebe instruções para concluir o cadastro.",
    },
];

export default function SuportePage() {
    return (
        <div className="min-h-screen bg-[#f8f9fb] px-4 pb-10 pt-16 dark:bg-[#0b0d10] md:px-8">
            <div className="mx-auto w-full max-w-[860px]">
                <div className="mb-6 flex items-center justify-between gap-3">
                    <div>
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Voltar para o site
                        </Link>
                    </div>
                    <div className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                        <ThemeToggle />
                    </div>
                </div>

                <div className="mb-10">
                    <span className="text-xs font-semibold tracking-widest text-gray-400 uppercase">
                        Central de Ajuda
                    </span>
                    <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                        Como podemos ajudar?
                    </h1>
                    <div className="relative mt-6">
                        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            placeholder="Buscar por tópico, funcionalidade ou dúvida..."
                            className="w-full rounded-xl border border-gray-200 bg-white py-3.5 pl-11 pr-4 text-sm text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-black/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-white/10"
                        />
                    </div>
                </div>

                <div className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {categories.map((category) => {
                        const Icon = category.icon;
                        return (
                            <article
                                key={category.title}
                                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-colors hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600"
                                style={{ borderTopWidth: "2px", borderTopColor: category.borderColor }}
                            >
                                <Icon className="mb-3 h-4 w-4 text-gray-700 dark:text-gray-300" />
                                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{category.title}</h2>
                                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{category.description}</p>
                            </article>
                        );
                    })}
                </div>

                <section>
                    <h3 className="mb-4 text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">Perguntas frequentes</h3>
                    <Accordion type="single" collapsible className="space-y-3">
                        {faqItems.map((item) => (
                            <AccordionItem
                                key={item.id}
                                value={item.id}
                                className="overflow-hidden rounded-xl border border-gray-200 bg-white px-5 shadow-sm dark:border-gray-700 dark:bg-gray-900"
                            >
                                <AccordionTrigger className="py-4 text-left text-sm text-gray-700 hover:no-underline dark:text-gray-200 [&>svg]:text-gray-400 dark:[&>svg]:text-gray-500">
                                    {item.question}
                                </AccordionTrigger>
                                <AccordionContent className="pb-4 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                                    {item.answer}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </section>

                <section className="mt-10 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                    <p className="text-sm text-gray-600 dark:text-gray-300">Não encontrou o que precisava?</p>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                        <a
                            href="https://wa.me/5582991709740"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                        >
                            <MessageCircle className="h-4 w-4" />
                            Falar com suporte
                        </a>
                        <a
                            href="mailto:suporte@limvex.com.br"
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                        >
                            <Mail className="h-4 w-4" />
                            Enviar e-mail
                        </a>
                    </div>
                </section>
            </div>
        </div>
    );
}
