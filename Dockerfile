FROM node:20-alpine AS builder

WORKDIR /app

# Instalar pnpm via corepack (mais confiável que npm install -g)
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Copiar manifests do monorepo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copiar package.json de cada workspace
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/config/package.json ./packages/config/
COPY packages/ui/package.json ./packages/ui/

# Instalar dependências
RUN pnpm install --frozen-lockfile

# Copiar código fonte
COPY apps/api/ ./apps/api/
COPY packages/ ./packages/

# Build shared primeiro
RUN pnpm --filter @licitafacil/shared build 2>/dev/null || echo "sem build step"

# Gerar Prisma Client
RUN cd apps/api && npx prisma generate

# Build da API
RUN pnpm --filter @licitafacil/api build

# Imagem final
FROM node:20-alpine AS runner

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

EXPOSE 3001

CMD ["node", "apps/api/dist/main.js"]
