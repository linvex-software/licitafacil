-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT,
    "severity" TEXT NOT NULL,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "metadata" JSONB,
    "status" TEXT NOT NULL DEFAULT 'UNSEEN',
    "createdBy" TEXT,
    "seenAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "alerts_empresaId_status_idx" ON "alerts"("empresaId", "status");

-- CreateIndex
CREATE INDEX "alerts_empresaId_severity_idx" ON "alerts"("empresaId", "severity");

-- CreateIndex
CREATE INDEX "alerts_empresaId_resourceType_resourceId_idx" ON "alerts"("empresaId", "resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "alerts_createdAt_idx" ON "alerts"("createdAt");

-- CreateIndex
CREATE INDEX "alerts_empresaId_deletedAt_idx" ON "alerts"("empresaId", "deletedAt");

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
