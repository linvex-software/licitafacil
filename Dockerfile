FROM node:20-bookworm-slim AS builder

# Bust cache
ARG BUILDTIME=unknown

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/config/package.json ./packages/config/
COPY packages/ui/package.json ./packages/ui/

RUN pnpm install --frozen-lockfile

COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

RUN pnpm --filter @licitafacil/shared build 2>/dev/null || echo "ok"
RUN cd apps/api && npx prisma generate
RUN pnpm --filter @licitafacil/api build

FROM node:20-bookworm-slim AS runner

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Install Chromium and its minimum runtime dependencies efficiently
RUN apt-get update && apt-get install -y --no-install-recommends \
  chromium \
  libxss1 \
  && rm -rf /var/lib/apt/lists/* \
  && apt-get clean

ENV CHROMIUM_PATH=/usr/bin/chromium

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

EXPOSE 3001
# Aplica migrações pendentes (ex.: billing) antes de subir a API.
# Se migrate falhar com P3009 em 20260304181542_add_password_reset_fields (colunas já existem), rode UMA vez no mesmo DATABASE_URL:
#   cd apps/api && pnpm prisma:resolve:password-reset-applied && pnpm prisma:deploy
CMD ["/bin/sh", "-c", "set -e; cd /app/apps/api && npx prisma migrate deploy && cd /app && exec node apps/api/dist/main.js"]
