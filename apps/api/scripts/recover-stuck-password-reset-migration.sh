#!/usr/bin/env bash
# Uso (uma vez, no seu PC):
#   1. Railway → serviço Postgres → Variables → use a URL PÚBLICA (TCP proxy / "Public network"),
#      NÃO use *.railway.internal — isso só funciona de dentro da Railway.
#   2: export DATABASE_URL='postgresql://...@trolley.proxy.rlwy.net:12345/railway'
#   3: pnpm --filter @licitafacil/api prisma:recover:password-reset-stuck
#
# Marca a migração presa como aplicada e aplica o restante (ex.: billing).

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Erro: defina DATABASE_URL (URL do Postgres de produção na Railway)." >&2
  exit 1
fi

if [[ "${DATABASE_URL}" == *".railway.internal"* ]] || [[ "${DATABASE_URL}" == *"railway.internal"* ]]; then
  echo "Erro: DATABASE_URL usa host interno (.railway.internal)." >&2
  echo "Esse endereço não alcança o Postgres a partir do seu computador (só de outros serviços na Railway)." >&2
  echo "No painel: Postgres → Connect → copie a URL com host público (ex.: *.rlwy.net ou proxy.railway.app) e porta exposta." >&2
  echo "Alternativa: \`railway connect postgres\` e use a URL que a CLI mostrar." >&2
  exit 1
fi

echo ">> prisma migrate resolve --applied 20260304181542_add_password_reset_fields"
pnpm exec prisma migrate resolve --applied 20260304181542_add_password_reset_fields

echo ">> prisma migrate deploy"
pnpm exec prisma migrate deploy

echo "Pronto. Na Railway, faça Redeploy do serviço da API (ou push) para o container subir limpo."
