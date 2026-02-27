-- CreateTable
CREATE TABLE "bid_predictions" (
    "id" TEXT NOT NULL,
    "bidId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "recomendacao" TEXT NOT NULL,
    "fatores" JSONB NOT NULL,
    "explicacao" TEXT,
    "acoes" JSONB,
    "tokensUsados" INTEGER,
    "tempoSegundos" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bid_predictions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bid_predictions_bidId_idx" ON "bid_predictions"("bidId");

-- CreateIndex
CREATE INDEX "bid_predictions_empresaId_createdAt_idx" ON "bid_predictions"("empresaId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "bid_predictions" ADD CONSTRAINT "bid_predictions_bidId_fkey" FOREIGN KEY ("bidId") REFERENCES "bids"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bid_predictions" ADD CONSTRAINT "bid_predictions_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
