"use client";

import { FileText, LayoutDashboard, ListChecks, Search, ShieldCheck, HelpCircle, MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function SuportePage() {
    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 ease-out p-4 md:p-8 max-w-5xl mx-auto">
            <div>
                <h1 className="text-3xl font-heading font-bold text-slate-900 dark:text-white tracking-tight">Suporte</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
                    Como podemos ajudar você a gerenciar suas licitações?
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                <Card className="shadow-sm border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors">
                    <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/50">
                        <div className="flex items-center gap-3">
                            <div className="bg-emerald-100 dark:bg-emerald-950/50 p-2.5 rounded-lg">
                                <LayoutDashboard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <CardTitle className="text-lg">Licitações</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4 text-sm text-slate-600 dark:text-slate-400">
                        Acompanhe suas licitações ativas, altere o status no funil kanban e controle o estado operacional.
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700 transition-colors">
                    <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/50">
                        <div className="flex items-center gap-3">
                            <div className="bg-purple-100 dark:bg-purple-950/50 p-2.5 rounded-lg">
                                <ListChecks className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <CardTitle className="text-lg">Inteligência Artificial</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4 text-sm text-slate-600 dark:text-slate-400">
                        Análises de editais guiadas por IA, leitura automática de prazos, chat para tirar dúvidas e predição de sucesso.
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                    <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/50">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-100 dark:bg-blue-950/50 p-2.5 rounded-lg">
                                <Search className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <CardTitle className="text-lg">Busca PNCP</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4 text-sm text-slate-600 dark:text-slate-400">
                        Encontre novas oportunidades de negócios em licitações públicas diretamente pela plataforma.
                    </CardContent>
                </Card>
            </div>

            <Accordion type="single" collapsible className="w-full space-y-4">
                {/* Seção 1 */}
                <AccordionItem value="item-1" className="border-none bg-white dark:bg-slate-900 shadow-sm rounded-xl overflow-hidden px-2">
                    <AccordionTrigger className="hover:no-underline py-4 px-4 data-[state=open]:border-b dark:data-[state=open]:border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-lg">
                                <LayoutDashboard className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                            </div>
                            <span className="font-heading font-semibold text-lg">Visão Geral & Licitações</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 px-4 pb-6 text-slate-600 dark:text-slate-300 space-y-3">
                        <p>O painel de licitações funciona como um funil (Kanban). Você pode acompanhar desde a Captação até a Homologação e Adjudicação das licitações de interesse da sua empresa.</p>
                        <ul className="list-disc pl-5 space-y-1 mt-2">
                            <li><strong>Adicionar licitação:</strong> Clique em &quot;Novo Processo&quot; no canto direito da tabela principal.</li>
                            <li><strong>Alterar fase:</strong> No botão ⋯ de cada licitação, selecione &quot;Mover coluna&quot; ou altere na página da própria licitação.</li>
                            <li><strong>Estado Operacional:</strong> Indica se está &quot;OK&quot;, &quot;Descartada&quot;, &quot;Vencida&quot; ou &quot;Em Risco&quot; (para chamar sua atenção sobre irregularidades).</li>
                        </ul>
                    </AccordionContent>
                </AccordionItem>

                {/* Seção 2 */}
                <AccordionItem value="item-2" className="border-none bg-white dark:bg-slate-900 shadow-sm rounded-xl overflow-hidden px-2">
                    <AccordionTrigger className="hover:no-underline py-4 px-4 data-[state=open]:border-b dark:data-[state=open]:border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-lg">
                                <FileText className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                            </div>
                            <span className="font-heading font-semibold text-lg">Documentos e Prazos</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 px-4 pb-6 text-slate-600 dark:text-slate-300 space-y-3">
                        <p>Mantenha sua pasta virtual organizada e receba alertas sobre o que está por vencer.</p>
                        <ul className="list-disc pl-5 space-y-1 mt-2">
                            <li><strong>Prazos:</strong> Módulo onde a IA (ou você de forma manual) inclui todos os eventos do edital. Seja alertado com antecedência de impugnações.</li>
                            <li><strong>Documentos da Licitação:</strong> Suba atestados, propostas e habilitações de cada certame específico.</li>
                            <li><strong>Documentos Gerais (Empresa):</strong> São documentos globais, como Certidões Negativas, Balanço e Contratos, que são reutilizados em vários processos. O sistema alerta perto do vencimento.</li>
                        </ul>
                    </AccordionContent>
                </AccordionItem>

                {/* Seção 3 */}
                <AccordionItem value="item-3" className="border-none bg-white dark:bg-slate-900 shadow-sm rounded-xl overflow-hidden px-2">
                    <AccordionTrigger className="hover:no-underline py-4 px-4 data-[state=open]:border-b dark:data-[state=open]:border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-lg">
                                <ListChecks className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                            </div>
                            <span className="font-heading font-semibold text-lg">Checklist & Inteligência Artificial</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 px-4 pb-6 text-slate-600 dark:text-slate-300 space-y-3">
                        <p>Acelere drasticamente o seu fluxo de trabalho combinando nosso checklist com a leitura inteligente de PDF.</p>
                        <ul className="list-disc pl-5 space-y-1 mt-2">
                            <li><strong>Análise de Edital:</strong> Na aba Visão Geral, envie o edital em PDF e a IA criará uma síntese do objeto, datas e requisitos.</li>
                            <li><strong>Gerar Checklist por IA:</strong> Após a Análise de Edital, a IA pode transcrever e catalogar todos os requisitos burocráticos como tarefas automatizadas no seu Checklist.</li>
                            <li><strong>Checklist manual:</strong> Use o botão &quot;+ Adicionar item&quot; para criar obrigações para a equipe de forma manual.</li>
                            <li><strong>Predição de Sucesso:</strong> A IA examina os requisitos e gera uma nota de 0 a 100 estimando suas chances baseado no rigor imposto. <em>(Uso de apoio, passível de otimizações).</em></li>
                        </ul>
                    </AccordionContent>
                </AccordionItem>

                {/* Seção 4 */}
                <AccordionItem value="item-4" className="border-none bg-white dark:bg-slate-900 shadow-sm rounded-xl overflow-hidden px-2">
                    <AccordionTrigger className="hover:no-underline py-4 px-4 data-[state=open]:border-b dark:data-[state=open]:border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-lg">
                                <Search className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                            </div>
                            <span className="font-heading font-semibold text-lg">Busca Avançada (PNCP)</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 px-4 pb-6 text-slate-600 dark:text-slate-300 space-y-3">
                        <p>Integração em tempo real com o Portal Nacional de Contratações Públicas.</p>
                        <ul className="list-disc pl-5 space-y-1 mt-2">
                            <li><strong>Busca Diária:</strong> Coloque as palavras-chaves de seu serviço/produto (ex: &quot;Serviço de limpeza&quot;, &quot;Material escolar&quot;) para achar certames Brasil afora.</li>
                            <li><strong>Data é obrigatória:</strong> Buscas amplas sem delimitador de Data Inicial e Final esbarram no limite da rede do governo. Especifique no máximo algumas semanas para as melhores respostas.</li>
                            <li><strong>Salvar termos:</strong> É possível criar rotinas de acompanhamento para que o sistema vasculhe certames do seu nicho e te alerte.</li>
                        </ul>
                    </AccordionContent>
                </AccordionItem>

                {/* Seção 5 */}
                <AccordionItem value="item-5" className="border-none bg-white dark:bg-slate-900 shadow-sm rounded-xl overflow-hidden px-2">
                    <AccordionTrigger className="hover:no-underline py-4 px-4 data-[state=open]:border-b dark:data-[state=open]:border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-lg">
                                <ShieldCheck className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                            </div>
                            <span className="font-heading font-semibold text-lg">Gestão de Usuários</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 px-4 pb-6 text-slate-600 dark:text-slate-300 space-y-3">
                        <p>Níveis de hierarquia garantem segurança operacional do seu escritório.</p>
                        <ul className="list-disc pl-5 space-y-1 mt-2">
                            <li><strong>Colaborador:</strong> Navega, edita e manuseia licitações. Sem poderes sobre os usuários ou configurações matriz.</li>
                            <li><strong>Admin:</strong> Possui controle e gerenciamento sobre equipes. Pode suspender e convidar novos Colaboradores.</li>
                            <li><strong>Super Admin:</strong> Dono da conta. Visibilidade total do ambiente, poder para criar novos Admins e controle financeiro/assinaturas.</li>
                        </ul>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>

            <div className="mt-8 text-center bg-slate-50 dark:bg-slate-800/20 p-6 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col items-center">
                <HelpCircle className="w-8 h-8 text-slate-400 mb-2" />
                <h3 className="font-medium text-slate-900 dark:text-slate-100 text-lg">Ainda precisa de ajuda?</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-6">
                    Nossa equipe de suporte técnico está pronta para ouvir você. Entre em contato pelos canais oficiais de comunicação da Licita Fácil.
                </p>
                <a
                    href="https://wa.me/5582991709740"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-medium transition-colors shadow-sm"
                >
                    <MessageCircle className="w-5 h-5" />
                    Chamar no WhatsApp
                </a>
            </div>
        </div>
    );
}
