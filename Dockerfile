FROM node:20-alpine AS builder
RUN npm install -g pnpm@9.15.0
WORKDIR /app

# Copiar manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copiar package.json de todos os workspaces
COPY apps/api/package.json ./apps/api/
COPY packages/ ./packages/

# Instalar todas as dependências
RUN pnpm install --frozen-lockfile

# Copiar código fonte
COPY apps/api/ ./apps/api/

# Build do shared primeiro (se tiver script de build)
RUN pnpm --filter @licitafacil/shared build 2>/dev/null || echo "shared sem build step, ok"

# Gerar Prisma Client
RUN cd apps/api && npx prisma generate

# Build da API
RUN pnpm --filter @licitafacil/api build

# ── Imagem de produção ──
FROM node:20-alpine AS runner
RUN npm install -g pnpm@9.15.0
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]
