-- CreateEnum
CREATE TYPE "TipoPeticao" AS ENUM ('IMPUGNACAO', 'ESCLARECIMENTO', 'INTENCAO_RECURSO', 'RECURSO', 'CONTRA_RAZAO');

-- CreateEnum
CREATE TYPE "StatusPeticao" AS ENUM ('RASCUNHO', 'ENVIADO');

-- CreateTable
CREATE TABLE "peticoes" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "bidId" TEXT NOT NULL,
    "tipo" "TipoPeticao" NOT NULL,
    "conteudo" TEXT,
    "nomeArquivo" TEXT,
    "dataEnvio" TIMESTAMP(3),
    "status" "StatusPeticao" NOT NULL DEFAULT 'RASCUNHO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "peticoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "peticoes_empresaId_bidId_idx" ON "peticoes"("empresaId", "bidId");

-- CreateIndex
CREATE INDEX "peticoes_empresaId_deletedAt_idx" ON "peticoes"("empresaId", "deletedAt");

-- AddForeignKey
ALTER TABLE "peticoes" ADD CONSTRAINT "peticoes_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peticoes" ADD CONSTRAINT "peticoes_bidId_fkey" FOREIGN KEY ("bidId") REFERENCES "bids"("id") ON DELETE CASCADE ON UPDATE CASCADE;
