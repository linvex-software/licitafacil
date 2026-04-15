#!/usr/bin/env bash
# Uso (uma vez, no seu PC):
#   1. Railway → Postgres → Variables → copie a variável DATABASE_URL **pública** (host *.rlwy.net, não *.railway.internal).
#   2: export DATABASE_URL='postgresql://...'
#   3: na raiz do monorepo: pnpm --filter @licitafacil/api prisma:recover:password-reset-stuck
#
# O Prisma carrega apps/api/.env por padrão e pode SOBRESCREVER o DATABASE_URL do shell — este script
# renomeia .env temporariamente para só valer o que você exportou.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Erro: defina DATABASE_URL (URL do Postgres de produção na Railway)." >&2
  exit 1
fi

if [[ "${DATABASE_URL}" == *".railway.internal"* ]] || [[ "${DATABASE_URL}" == *"railway.internal"* ]]; then
  echo "Erro: DATABASE_URL usa host interno (.railway.internal)." >&2
  echo "Use a URL pública do Postgres no painel da Railway." >&2
  exit 1
fi

# Proxy público Railway costuma exigir TLS
if [[ "${DATABASE_URL}" != *"sslmode="* ]] && [[ "${DATABASE_URL}" == *"rlwy.net"* ]]; then
  if [[ "${DATABASE_URL}" == *\?* ]]; then
    export DATABASE_URL="${DATABASE_URL}&sslmode=require"
  else
    export DATABASE_URL="${DATABASE_URL}?sslmode=require"
  fi
  echo ">> Adicionado sslmode=require à URL (requisito comum do proxy público)."
fi

ENV_BACK=""
if [[ -f .env ]]; then
  ENV_BACK=".env.__prisma_recovery_$$"
  mv .env "$ENV_BACK"
  restore_env() {
    if [[ -n "$ENV_BACK" && -f "$ENV_BACK" ]]; then
      mv "$ENV_BACK" .env
    fi
  }
  trap restore_env EXIT
  echo ">> apps/api/.env renomeado temporariamente para o Prisma usar só o DATABASE_URL deste shell."
fi

# Mostra só host:porta (senha pode conter "@"; não usar split simples na URL)
DB_REST="${DATABASE_URL#*://}"
DB_CRED_AND_HOST="${DB_REST#*@}"
DB_HOSTPORT="${DB_CRED_AND_HOST%%/*}"
echo ">> Conectando em: ${DB_HOSTPORT}"
echo ">> prisma migrate resolve --applied 20260304181542_add_password_reset_fields"
pnpm exec prisma migrate resolve --applied 20260304181542_add_password_reset_fields

echo ">> prisma migrate deploy"
pnpm exec prisma migrate deploy

trap - EXIT
restore_env 2>/dev/null || true

echo "Pronto. Na Railway, faça Redeploy do serviço da API."
