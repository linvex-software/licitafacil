#!/usr/bin/env bash
# Uso (uma vez, no seu PC):
#   1. Railway → Postgres → copiar "Database URL" (ou variável DATABASE_URL do serviço da API)
#   2: export DATABASE_URL='postgresql://...'
#   3: pnpm --filter @licitafacil/api exec bash scripts/recover-stuck-password-reset-migration.sh
#
# Marca a migração presa como aplicada e aplica o restante (ex.: billing).

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Erro: defina DATABASE_URL (URL do Postgres de produção na Railway)." >&2
  exit 1
fi

echo ">> prisma migrate resolve --applied 20260304181542_add_password_reset_fields"
pnpm exec prisma migrate resolve --applied 20260304181542_add_password_reset_fields

echo ">> prisma migrate deploy"
pnpm exec prisma migrate deploy

echo "Pronto. Na Railway, faça Redeploy do serviço da API (ou push) para o container subir limpo."
