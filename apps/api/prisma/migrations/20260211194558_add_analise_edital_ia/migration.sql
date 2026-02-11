-- CreateEnum
CREATE TYPE "AnaliseStatus" AS ENUM ('PROCESSANDO', 'CONCLUIDA', 'ERRO');

-- AlterTable
ALTER TABLE "clientes_config" ADD COLUMN     "maxAnalisesMes" INTEGER NOT NULL DEFAULT 50;

-- CreateTable
CREATE TABLE "edital_analises" (
    "id" TEXT NOT NULL,
    "bidId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "pdfUrl" TEXT,
    "pdfTamanhoMB" DOUBLE PRECISION,
    "resultado" JSONB,
    "tokensUsados" INTEGER,
    "tempoSegundos" INTEGER,
    "status" "AnaliseStatus" NOT NULL DEFAULT 'PROCESSANDO',
    "erroMensagem" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "edital_analises_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "edital_analises_empresaId_createdAt_idx" ON "edital_analises"("empresaId", "createdAt");

-- CreateIndex
CREATE INDEX "edital_analises_bidId_idx" ON "edital_analises"("bidId");

-- AddForeignKey
ALTER TABLE "edital_analises" ADD CONSTRAINT "edital_analises_bidId_fkey" FOREIGN KEY ("bidId") REFERENCES "bids"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "edital_analises" ADD CONSTRAINT "edital_analises_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
