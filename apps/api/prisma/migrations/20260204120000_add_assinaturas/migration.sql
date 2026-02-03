-- CreateEnum
CREATE TYPE "StatusAssinatura" AS ENUM ('ATIVO', 'VENCIDO', 'CANCELADO');

-- CreateTable
CREATE TABLE "assinaturas" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "planoId" TEXT NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataVencimento" TIMESTAMP(3) NOT NULL,
    "status" "StatusAssinatura" NOT NULL DEFAULT 'ATIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assinaturas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assinaturas_empresaId_idx" ON "assinaturas"("empresaId");
CREATE INDEX "assinaturas_empresaId_status_idx" ON "assinaturas"("empresaId", "status");
CREATE INDEX "assinaturas_dataVencimento_idx" ON "assinaturas"("dataVencimento");

-- AddForeignKey
ALTER TABLE "assinaturas" ADD CONSTRAINT "assinaturas_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assinaturas" ADD CONSTRAINT "assinaturas_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "planos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed: uma assinatura ATIVA por empresa existente (vencimento em 1 ano)
-- Requer PostgreSQL 13+ (gen_random_uuid()) ou extensão pgcrypto
INSERT INTO "assinaturas" ("id", "empresaId", "planoId", "dataInicio", "dataVencimento", "status", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  e.id,
  e."planoId",
  NOW(),
  NOW() + INTERVAL '1 year',
  'ATIVO',
  NOW(),
  NOW()
FROM "empresas" e
WHERE e."deletedAt" IS NULL;
