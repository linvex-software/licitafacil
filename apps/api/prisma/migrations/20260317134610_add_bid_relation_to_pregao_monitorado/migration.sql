-- AlterTable
ALTER TABLE "PregaoMonitorado" ADD COLUMN     "bidId" TEXT;

-- CreateIndex
CREATE INDEX "PregaoMonitorado_bidId_idx" ON "PregaoMonitorado"("bidId");

-- AddForeignKey
ALTER TABLE "PregaoMonitorado" ADD CONSTRAINT "PregaoMonitorado_bidId_fkey" FOREIGN KEY ("bidId") REFERENCES "bids"("id") ON DELETE SET NULL ON UPDATE CASCADE;
