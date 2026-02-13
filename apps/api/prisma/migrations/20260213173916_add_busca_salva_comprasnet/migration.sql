-- CreateTable
CREATE TABLE "buscas_salvas" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "filtros" JSONB NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "autoImportar" BOOLEAN NOT NULL DEFAULT false,
    "ultimaExecucao" TIMESTAMP(3),
    "totalImportadas" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "buscas_salvas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "buscas_salvas_empresaId_ativa_idx" ON "buscas_salvas"("empresaId", "ativa");

-- CreateIndex
CREATE INDEX "buscas_salvas_empresaId_deletedAt_idx" ON "buscas_salvas"("empresaId", "deletedAt");

-- AddForeignKey
ALTER TABLE "buscas_salvas" ADD CONSTRAINT "buscas_salvas_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
