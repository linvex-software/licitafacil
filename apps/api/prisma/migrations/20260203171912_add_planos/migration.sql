-- CreateEnum
CREATE TYPE "TipoPlano" AS ENUM ('INDIVIDUAL', 'EMPRESA');

-- CreateTable
CREATE TABLE "planos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoPlano" NOT NULL,
    "maxEmpresas" INTEGER NOT NULL,
    "maxUsuarios" INTEGER NOT NULL,
    "precoMensal" DECIMAL(10,2) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "planos_tipo_idx" ON "planos"("tipo");

-- CreateIndex
CREATE INDEX "planos_ativo_idx" ON "planos"("ativo");

-- Seed planos (IDs fixos para referência em empresas existentes)
INSERT INTO "planos" ("id", "nome", "tipo", "maxEmpresas", "maxUsuarios", "precoMensal", "ativo", "createdAt", "updatedAt")
VALUES
  ('00000000-0000-0000-0000-000000000010', 'Individual', 'INDIVIDUAL', 1, 1, 29.90, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-0000-0000-000000000011', 'Empresa', 'EMPRESA', 1, 5, 99.90, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- AlterTable: add planoId as nullable first (para tabelas com dados existentes)
ALTER TABLE "empresas" ADD COLUMN "planoId" TEXT;
ALTER TABLE "empresas" ADD COLUMN "usuariosExtrasContratados" INTEGER NOT NULL DEFAULT 0;

-- Atualizar empresas existentes para plano Individual
UPDATE "empresas" SET "planoId" = '00000000-0000-0000-0000-000000000010' WHERE "planoId" IS NULL;

-- Tornar planoId obrigatório
ALTER TABLE "empresas" ALTER COLUMN "planoId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "empresas_planoId_idx" ON "empresas"("planoId");

-- AddForeignKey
ALTER TABLE "empresas" ADD CONSTRAINT "empresas_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "planos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
