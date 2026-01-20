-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "bidId" TEXT;

-- CreateIndex
CREATE INDEX "documents_empresaId_bidId_idx" ON "documents"("empresaId", "bidId");

-- CreateIndex
CREATE INDEX "documents_bidId_idx" ON "documents"("bidId");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_bidId_fkey" FOREIGN KEY ("bidId") REFERENCES "bids"("id") ON DELETE SET NULL ON UPDATE CASCADE;
