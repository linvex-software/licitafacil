# Arquitetura do Projeto Licitafacil

## Visão Geral

O Licitafacil é um sistema de gestão de licitações construído como um monorepo moderno, utilizando as melhores práticas de desenvolvimento fullstack.

## Estrutura do Monorepo

### Apps

#### `apps/web`
- **Tecnologia**: Next.js 15 (App Router)
- **Linguagem**: TypeScript
- **Estilização**: Tailwind CSS
- **Porta**: 3000
- **Responsabilidades**:
  - Interface de usuário
  - Páginas e rotas
  - Componentes React
  - Consumo da API

#### `apps/api`
- **Tecnologia**: NestJS
- **Linguagem**: TypeScript
- **Porta**: 3001
- **Responsabilidades**:
  - Lógica de negócio
  - Endpoints REST
  - Validação de dados
  - Integração com banco de dados (futuro)

### Packages

#### `packages/shared`
- **Propósito**: Código compartilhado entre frontend e backend
- **Conteúdo**:
  - Schemas de validação Zod
  - Tipos TypeScript compartilhados
  - Interfaces de API
  - Constantes e enums

#### `packages/config`
- **Propósito**: Configurações compartilhadas
- **Conteúdo**:
  - TypeScript config base
  - ESLint configs
  - Prettier config
  - Padronização de código

#### `packages/ui`
- **Propósito**: Biblioteca de componentes UI reutilizáveis
- **Status**: Em desenvolvimento
- **Futuro**: Componentes React compartilhados

## Decisões Técnicas

### Por que Monorepo?

1. **Compartilhamento de código**: Tipos e validações são reutilizados
2. **Builds otimizados**: Turborepo cache inteligente
3. **Desenvolvimento simplificado**: Um único comando para rodar tudo
4. **Versionamento unificado**: Mudanças atômicas em múltiplos packages

### Por que PNPM?

1. **Performance**: Mais rápido que npm/yarn
2. **Eficiência de espaço**: Hard links ao invés de cópias
3. **Strict mode**: Previne dependências fantasmas
4. **Workspaces nativos**: Suporte excelente para monorepos

### Por que Turborepo?

1. **Cache inteligente**: Não rebuilda o que não mudou
2. **Paralelização**: Executa tarefas em paralelo quando possível
3. **Pipelines**: Define dependências entre tarefas
4. **Remote caching**: Compartilha cache entre desenvolvedores (futuro)

### Por que Zod?

1. **Type-safe**: Inferência de tipos TypeScript
2. **Runtime validation**: Valida em tempo de execução
3. **Composição**: Schemas reutilizáveis e compostos
4. **DX excelente**: API intuitiva e mensagens de erro claras

## Fluxo de Dados

```
User → apps/web → apps/api → Database (futuro)
              ↓         ↓
         packages/shared (tipos e validações)
```

## Padrões de Código

### Importações

```typescript
// ✅ Correto - importação de workspace
import { bidSchema } from "@licitafacil/shared";

// ❌ Errado - caminho relativo entre packages
import { bidSchema } from "../../packages/shared";
```

### Validação

```typescript
// Backend (NestJS)
import { bidSchema } from "@licitafacil/shared";

const result = bidSchema.safeParse(data);
if (!result.success) {
  throw new BadRequestException(result.error);
}
```

### Tipos

```typescript
// Sempre use tipos inferidos dos schemas Zod
import type { Bid } from "@licitafacil/shared";

// Não duplique tipos
```

## Estrutura de Diretórios

```
licitafacil/
├── apps/
│   ├── web/                 # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/        # App Router
│   │   │   └── components/ # Componentes React
│   │   └── package.json
│   └── api/                 # NestJS backend
│       ├── src/
│       │   ├── modules/    # Módulos NestJS
│       │   └── main.ts
│       └── package.json
├── packages/
│   ├── shared/             # Código compartilhado
│   │   ├── src/
│   │   │   ├── schemas/   # Schemas Zod
│   │   │   └── types.ts   # Tipos TypeScript
│   │   └── package.json
│   ├── config/             # Configs
│   │   ├── tsconfig.base.json
│   │   ├── eslint/
│   │   └── prettier/
│   └── ui/                 # Componentes UI
│       └── src/
├── docs/                   # Documentação
├── .github/                # Templates
├── turbo.json              # Configuração Turborepo
├── pnpm-workspace.yaml     # Workspaces
└── package.json            # Root package
```

## Próximos Passos

1. **Banco de Dados**: Integração com Prisma
2. **Autenticação**: JWT + refresh tokens
3. **Multi-tenancy**: Isolamento de dados por tenant
4. **Testes**: Jest + Testing Library
5. **CI/CD**: GitHub Actions
6. **Deploy**: Vercel (web) + Railway/Render (api)

## Convenções

### Commits

Seguir Conventional Commits:
- `feat:` nova funcionalidade
- `fix:` correção de bug
- `docs:` documentação
- `style:` formatação
- `refactor:` refatoração
- `test:` testes
- `chore:` configuração, build, etc

### Branches

- `main`: produção
- `develop`: desenvolvimento
- `feature/nome`: features
- `fix/nome`: correções

### PRs

- Título descritivo
- Descrição completa
- Checklist preenchido
- Testes passando

