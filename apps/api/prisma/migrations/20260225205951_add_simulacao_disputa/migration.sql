-- CreateTable
CREATE TABLE "simulacoes_disputa" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "bidId" TEXT,
    "valorInicial" DOUBLE PRECISION NOT NULL,
    "percentualDesconto" DOUBLE PRECISION NOT NULL,
    "numConcorrentes" INTEGER NOT NULL,
    "lanceSugerido" DOUBLE PRECISION NOT NULL,
    "lanceMinimo" DOUBLE PRECISION NOT NULL,
    "lanceAgressivo" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "simulacoes_disputa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "simulacoes_disputa_empresaId_bidId_createdAt_idx" ON "simulacoes_disputa"("empresaId", "bidId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "simulacoes_disputa" ADD CONSTRAINT "simulacoes_disputa_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulacoes_disputa" ADD CONSTRAINT "simulacoes_disputa_bidId_fkey" FOREIGN KEY ("bidId") REFERENCES "bids"("id") ON DELETE SET NULL ON UPDATE CASCADE;
