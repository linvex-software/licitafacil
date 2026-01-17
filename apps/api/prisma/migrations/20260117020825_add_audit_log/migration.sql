-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "metadata" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_empresaId_createdAt_idx" ON "audit_logs"("empresaId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_empresaId_action_idx" ON "audit_logs"("empresaId", "action");

-- CreateIndex
CREATE INDEX "audit_logs_empresaId_resourceType_resourceId_idx" ON "audit_logs"("empresaId", "resourceType", "resourceId");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
