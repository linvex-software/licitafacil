# Guia de Desenvolvimento

## Setup Inicial

### 1. Pré-requisitos

```bash
# Verificar versões
node --version  # >= 18.0.0
pnpm --version  # >= 9.0.0
```

### 2. Instalação

```bash
# Clonar o repositório
git clone <repository-url>
cd licitafacil

# Instalar dependências
pnpm install
```

### 3. Rodar o Projeto

```bash
# Rodar todos os projetos em paralelo
pnpm dev

# Ou individualmente:
pnpm --filter @licitafacil/web dev
pnpm --filter @licitafacil/api dev
```

## Comandos Úteis

### Root (todos os packages)

```bash
pnpm dev        # Desenvolvimento
pnpm build      # Build de produção
pnpm lint       # Lint
pnpm typecheck  # Type checking
pnpm test       # Testes
pnpm clean      # Limpar builds e node_modules
```

### Filtros (packages específicos)

```bash
# Web
pnpm --filter @licitafacil/web dev
pnpm --filter @licitafacil/web build

# API
pnpm --filter @licitafacil/api dev
pnpm --filter @licitafacil/api build

# Shared
pnpm --filter @licitafacil/shared build
```

### Adicionar Dependências

```bash
# Adicionar no root (devDependencies)
pnpm add -w -D <package>

# Adicionar em um workspace específico
pnpm --filter @licitafacil/web add <package>
pnpm --filter @licitafacil/api add <package>

# Adicionar workspace como dependência
# (já configurado, mas o padrão é:)
# "dependencies": {
#   "@licitafacil/shared": "workspace:*"
# }
```

## Estrutura de Desenvolvimento

### Criar um Novo Módulo na API

```bash
cd apps/api

# Gerar módulo
npx nest g module bids
npx nest g controller bids
npx nest g service bids
```

### Criar um Novo Schema Shared

```typescript
// packages/shared/src/schemas/novo-schema.ts
import { z } from "zod";

export const novoSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

export type Novo = z.infer<typeof novoSchema>;

// Exportar em packages/shared/src/index.ts
export * from "./schemas/novo-schema";
```

### Usar Schema no Backend

```typescript
// apps/api/src/bids/bids.service.ts
import { bidSchema, type Bid } from "@licitafacil/shared";

export class BidsService {
  create(data: unknown): Bid {
    // Validar com Zod
    const result = bidSchema.safeParse(data);

    if (!result.success) {
      throw new BadRequestException(result.error.format());
    }

    return result.data;
  }
}
```

### Usar Schema no Frontend

```typescript
// apps/web/src/app/bids/page.tsx
import { bidSchema, type Bid } from "@licitafacil/shared";

export default async function BidsPage() {
  const response = await fetch("http://localhost:3001/bids");
  const data = await response.json();

  // Validar resposta
  const bids = data.map((item: unknown) => bidSchema.parse(item));

  return (
    <div>
      {bids.map((bid: Bid) => (
        <div key={bid.id}>{bid.title}</div>
      ))}
    </div>
  );
}
```

## Debugging

### VS Code

Criar `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug API",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["--filter", "@licitafacil/api", "start:debug"],
      "skipFiles": ["<node_internals>/**"],
      "cwd": "${workspaceFolder}/apps/api"
    }
  ]
}
```

### Logs

```typescript
// Backend
console.log("[DEBUG]", data);

// Frontend (server component)
console.log("[SERVER]", data);

// Frontend (client component)
"use client";
console.log("[CLIENT]", data);
```

## Testes

### Unit Tests (API)

```typescript
// apps/api/src/bids/bids.service.spec.ts
import { Test } from "@nestjs/testing";
import { BidsService } from "./bids.service";

describe("BidsService", () => {
  let service: BidsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [BidsService],
    }).compile();

    service = module.get<BidsService>(BidsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
```

### E2E Tests (API)

```bash
cd apps/api
pnpm test:e2e
```

## Troubleshooting

### Limpar Cache

```bash
# Limpar cache do Turbo
rm -rf .turbo

# Limpar builds
pnpm clean

# Reinstalar dependências
rm -rf node_modules **/node_modules
pnpm install
```

### Problemas com Tipos

```bash
# Rebuild dos packages
pnpm --filter @licitafacil/shared build

# Verificar tipos
pnpm typecheck
```

### Porta em Uso

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

## Boas Práticas

1. **Sempre rode `pnpm typecheck` antes de commitar**
2. **Use os schemas do `@licitafacil/shared` para validação**
3. **Não faça build em produção sem testar localmente**
4. **Mantenha os packages sincronizados (`workspace:*`)**
5. **Documente decisões importantes em `docs/`**

## Performance Tips

1. **Use o cache do Turbo**: Não force rebuilds desnecessários
2. **Filtre comandos**: Use `--filter` para rodar apenas o necessário
3. **Build incremental**: TypeScript `incremental: true`
4. **Lazy loading**: Componentes e rotas no Next.js

