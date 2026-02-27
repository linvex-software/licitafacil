# Limvex Licitação

[cite_start]A **Limvex Licitação** é uma plataforma B2B enterprise desenvolvida para automatizar e centralizar todo o ciclo de vida de licitações públicas[cite: 41]. 

[cite_start]Empresas que participam regularmente de processos licitatórios enfrentam problemas como gestão manual, documentos dispersos e prazos perdidos[cite: 42]. [cite_start]A Limvex atua como um CRM e ERP de licitações, entregando economia real de 10 a 15 horas semanais por equipe e aumentando a taxa de aprovação[cite: 43].

---

## 1. O Problema vs. A Solução Limvex

| Problema | Solução Limvex |
| :--- | :--- |
| [cite_start]Gestão manual em planilhas e e-mails [cite: 44] | [cite_start]Plataforma centralizada com todos os processos [cite: 44] |
| [cite_start]Prazos perdidos e documentos vencidos [cite: 44] | [cite_start]Alertas automáticos e controle de validade [cite: 44] |
| [cite_start]Sem visibilidade do status das licitações [cite: 44] | [cite_start]Kanban visual com pipeline completo [cite: 44] |
| [cite_start]Análise de edital lenta e manual [cite: 44] | [cite_start]IA analisa o edital em segundos [cite: 44] |
| [cite_start]Petições jurídicas demoradas [cite: 44] | [cite_start]Geração automática de petições em .docx [cite: 44] |
| [cite_start]Nenhum dado sobre chance de sucesso [cite: 44] | [cite_start]Análise preditiva com IA por licitação [cite: 44] |

---

## 2. Funcionalidades do Sistema

A plataforma é dividida em módulos estratégicos:

### Gestão e Operação
* [cite_start]**Funil Kanban:** Controle visual de status (Prospecção → Habilitação → Proposta → Resultado) com arrastar e soltar[cite: 52, 53, 54, 55, 56].
* [cite_start]**Auditoria e Segurança:** Histórico completo de alterações, soft delete global (nenhum dado é perdido) e controle RBAC[cite: 50, 51, 94].
* [cite_start]**Biblioteca de Documentos:** Upload, versionamento, controle de validade e alertas de vencimento[cite: 58, 59, 60].
* [cite_start]**Gestão de Prazos:** Identificação automática de prazos em risco e calendário visual de eventos[cite: 66, 68, 70].
* [cite_start]**Checklist Inteligente:** Checklists padrão por modalidade com status de "Em Risco" para critérios não atendidos[cite: 62, 63, 64].

### Inteligência Artificial e Jurídico
* [cite_start]**Análise de Edital:** Integração com OpenAI (GPT-4o) para análise completa, chat interativo com o edital e análise preditiva de sucesso[cite: 71, 72, 73, 74].
* [cite_start]**Módulo Jurídico:** Geração automática de petições (Impugnação, Recurso) com download em formato `.docx` editável[cite: 76, 77, 78].

### Integrações e Relatórios
* [cite_start]**Governo:** Integração via API oficial com PNCP, ComprasNet e varredura de Diários Oficiais[cite: 83, 84, 85].
* [cite_start]**Dashboards:** KPIs em tempo real, simulador de disputa e geração de relatórios em PDF[cite: 88, 89, 90].

---

## 3. Arquitetura Técnica

[cite_start]A stack tecnológica foi escolhida visando um ambiente enterprise-grade escalável e seguro[cite: 99]:

* [cite_start]**Backend / API:** NestJS + TypeScript[cite: 99].
* [cite_start]**Frontend:** Next.js 14 + TypeScript[cite: 99].
* [cite_start]**Banco de Dados:** PostgreSQL + Prisma ORM[cite: 99].
* [cite_start]**Autenticação:** JWT + RBAC (Roles and Permissions)[cite: 99].
* [cite_start]**Inteligência Artificial:** OpenAI GPT-4o[cite: 99].
* [cite_start]**E-mail:** Resend / Mailtrap[cite: 99].
* [cite_start]**Hospedagem:** Railway (API e DB) e Vercel (Web CDN)[cite: 99].

---

## 4. Deploy e Onboarding Multitenant

[cite_start]Cada cliente recebe sua própria instância isolada do sistema, garantindo privacidade de dados (banco separado, URL própria, configurações independentes)[cite: 103]. [cite_start]Um bug em um cliente não afeta os demais[cite: 104].

[cite_start]O tempo de onboarding é de 2 a 3 horas [cite: 106][cite_start], seguindo o fluxo operado pelos próprios sócios[cite: 173]:
1. [cite_start]**Contrato:** Assinatura e pagamento do setup[cite: 105].
2. [cite_start]**Railway:** Criação do projeto, variáveis e migrations do Prisma[cite: 105, 180, 181, 182].
3. [cite_start]**Vercel:** Deploy no subdomínio (ex: `cliente.limvex.com.br`)[cite: 105, 107].
4. [cite_start]**OpenAI:** Criação de Project isolado com API Key e soft limit (ex: US$ 20/mês)[cite: 111, 113, 190, 192, 193].
5. [cite_start]**Treinamento:** Entrega de acessos e call de 1-2h[cite: 105, 200].

---

## 5. Comercial e Financeiro

[cite_start]O modelo comercial é 100% outbound (SDR prospectando via LinkedIn/WhatsApp e sócios fechando demos)[cite: 154, 155, 156].

### Precificação Padrão
* [cite_start]**Setup:** R$ 3.000 a R$ 3.500 (Implementação, configuração e treinamento. Cobre o CAC)[cite: 132, 160].
* [cite_start]**Recorrente Mensal:** R$ 997 / mês (Hospedagem, suporte, IA, atualizações)[cite: 132].
* [cite_start]**Personalizações:** Negociadas via adendo contratual[cite: 132, 166].

### Custos e Infraestrutura
* [cite_start]Break-even da infraestrutura coberto a partir do 2º cliente[cite: 146].
* [cite_start]Margem bruta do recorrente varia de 72% (1 cliente) a 83% (50 clientes)[cite: 145].

---

## 6. Roadmap 2026

**Imediato (Março):**
* [cite_start]Concluir build de produção e deploy do primeiro cliente piloto[cite: 207, 208].
* [cite_start]Configurar contas OpenAI e formalizar contrato padrão[cite: 209, 210].

**Curto Prazo (Abril / Maio):**
* [cite_start]Contratar SDR e iniciar campanhas no LinkedIn/Meta Ads[cite: 213, 214].
* [cite_start]Onboarding de 3-5 clientes pagantes e implementação do Scraper de Diários Oficiais[cite: 215, 216].

**Médio Prazo (Junho / Agosto):**
* [cite_start]Escalar para 10-15 clientes e contratar QA terceirizado[cite: 219, 220].
* [cite_start]Automatizar processos de onboarding[cite: 221].

**Visão Fim de Ano:**
* [cite_start]Alcançar 20-50 clientes ativos com MRR estável[cite: 225].
* [cite_start]Estruturar equipe de suporte dedicada[cite: 226].
* [cite_start]Avaliar expansão para novas verticais (municípios, cooperativas)[cite: 227].

---
[cite_start]*Documento confidencial - Limvex 2026* [cite: 3, 5, 231]
