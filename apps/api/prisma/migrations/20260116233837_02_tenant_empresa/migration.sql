-- CreateTable
CREATE TABLE "bids" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "agency" TEXT NOT NULL,
    "modality" TEXT NOT NULL,
    "legalStatus" TEXT NOT NULL,
    "operationalState" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bids_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bids_empresaId_idx" ON "bids"("empresaId");

-- CreateIndex
CREATE INDEX "bids_createdAt_idx" ON "bids"("createdAt");

-- AddForeignKey
ALTER TABLE "bids" ADD CONSTRAINT "bids_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
