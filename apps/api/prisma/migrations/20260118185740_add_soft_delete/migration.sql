-- AlterTable
ALTER TABLE "bids" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "empresas" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "bids_deletedAt_idx" ON "bids"("deletedAt");

-- CreateIndex
CREATE INDEX "bids_empresaId_deletedAt_idx" ON "bids"("empresaId", "deletedAt");

-- CreateIndex
CREATE INDEX "empresas_deletedAt_idx" ON "empresas"("deletedAt");

-- CreateIndex
CREATE INDEX "users_deletedAt_idx" ON "users"("deletedAt");

-- CreateIndex
CREATE INDEX "users_empresaId_deletedAt_idx" ON "users"("empresaId", "deletedAt");
