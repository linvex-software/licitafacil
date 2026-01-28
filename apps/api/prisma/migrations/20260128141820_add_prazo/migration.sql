-- CreateTable
CREATE TABLE "prazos" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "bidId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "dataPrazo" TIMESTAMP(3) NOT NULL,
    "descricao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "prazos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "prazos_empresaId_idx" ON "prazos"("empresaId");

-- CreateIndex
CREATE INDEX "prazos_empresaId_deletedAt_idx" ON "prazos"("empresaId", "deletedAt");

-- CreateIndex
CREATE INDEX "prazos_bidId_idx" ON "prazos"("bidId");

-- CreateIndex
CREATE INDEX "prazos_bidId_dataPrazo_idx" ON "prazos"("bidId", "dataPrazo");

-- CreateIndex
CREATE INDEX "prazos_dataPrazo_idx" ON "prazos"("dataPrazo");

-- CreateIndex
CREATE INDEX "prazos_deletedAt_idx" ON "prazos"("deletedAt");

-- AddForeignKey
ALTER TABLE "prazos" ADD CONSTRAINT "prazos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prazos" ADD CONSTRAINT "prazos_bidId_fkey" FOREIGN KEY ("bidId") REFERENCES "bids"("id") ON DELETE CASCADE ON UPDATE CASCADE;
