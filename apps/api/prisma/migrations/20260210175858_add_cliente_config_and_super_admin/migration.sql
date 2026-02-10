-- CreateEnum
CREATE TYPE "PlanoTipo" AS ENUM ('STARTER', 'PROFESSIONAL', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "ClienteStatus" AS ENUM ('ATIVO', 'SUSPENSO', 'CANCELADO', 'TRIAL');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'SUPER_ADMIN';

-- CreateTable
CREATE TABLE "clientes_config" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefone" TEXT,
    "responsavelComercial" TEXT,
    "plano" "PlanoTipo" NOT NULL DEFAULT 'STARTER',
    "valorSetup" DECIMAL(10,2) NOT NULL,
    "mensalidade" DECIMAL(10,2) NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataProximaCobranca" TIMESTAMP(3),
    "status" "ClienteStatus" NOT NULL DEFAULT 'ATIVO',
    "maxUsuarios" INTEGER NOT NULL DEFAULT 10,
    "maxStorageGB" INTEGER NOT NULL DEFAULT 10,
    "maxLicitacoesMes" INTEGER NOT NULL DEFAULT 50,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "clientes_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clientes_config_empresaId_key" ON "clientes_config"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_config_cnpj_key" ON "clientes_config"("cnpj");

-- CreateIndex
CREATE INDEX "clientes_config_status_idx" ON "clientes_config"("status");

-- CreateIndex
CREATE INDEX "clientes_config_plano_idx" ON "clientes_config"("plano");

-- CreateIndex
CREATE INDEX "clientes_config_deletedAt_idx" ON "clientes_config"("deletedAt");

-- CreateIndex
CREATE INDEX "clientes_config_cnpj_idx" ON "clientes_config"("cnpj");

-- AddForeignKey
ALTER TABLE "clientes_config" ADD CONSTRAINT "clientes_config_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
