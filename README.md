# Licitafacil

Sistema profissional de gestão de licitações construído com arquitetura moderna de monorepo.

## 🏗️ Arquitetura

Este é um monorepo gerenciado com PNPM Workspaces e Turborepo, contendo:

### Apps
- **`apps/web`**: Frontend Next.js 15 (App Router) + TypeScript + Tailwind CSS
- **`apps/api`**: Backend NestJS + TypeScript

### Packages
- **`packages/shared`**: Tipos e validações compartilhadas (Zod)
- **`packages/config`**: Configurações compartilhadas (TypeScript, ESLint, Prettier)
- **`packages/ui`**: Biblioteca de componentes UI (em desenvolvimento)

## 🚀 Início Rápido

### Pré-requisitos
- Node.js >= 18.0.0
- PNPM >= 9.0.0

### Instalação

```bash
# Instalar dependências
pnpm install

# Rodar em modo desenvolvimento
pnpm dev
```

O comando `pnpm dev` iniciará:
- 🌐 Web: http://localhost:3000
- 🔌 API: http://localhost:3001

### Outros Comandos

```bash
# Build de produção
pnpm build

# Lint
pnpm lint

# Typecheck
pnpm typecheck

# Testes
pnpm test

# Limpar node_modules e cache
pnpm clean
```

## 📦 Estrutura do Projeto

```
licitafacil/
├── apps/
│   ├── web/          # Next.js App Router
│   └── api/          # NestJS API
├── packages/
│   ├── shared/       # Tipos e schemas Zod
│   ├── config/       # Configs compartilhadas
│   └── ui/           # Componentes UI
├── docs/             # Documentação
├── .github/          # Templates e workflows
└── turbo.json        # Configuração Turborepo
```

## 🛠️ Stack Tecnológica

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: NestJS, TypeScript
- **Validação**: Zod
- **Build**: Turborepo
- **Package Manager**: PNPM

## 📝 Contribuindo

Veja [CONTRIBUTING.md](./CONTRIBUTING.md) para detalhes sobre nosso processo de desenvolvimento.

## 📄 Licença

MIT License - veja [LICENSE](./LICENSE) para detalhes.

