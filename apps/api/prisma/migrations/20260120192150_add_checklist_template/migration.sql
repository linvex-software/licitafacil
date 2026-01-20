-- CreateTable
CREATE TABLE "checklist_templates" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "modality" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "items" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "checklist_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "checklist_templates_empresaId_idx" ON "checklist_templates"("empresaId");

-- CreateIndex
CREATE INDEX "checklist_templates_empresaId_modality_idx" ON "checklist_templates"("empresaId", "modality");

-- CreateIndex
CREATE INDEX "checklist_templates_empresaId_deletedAt_idx" ON "checklist_templates"("empresaId", "deletedAt");

-- CreateIndex
CREATE INDEX "checklist_templates_empresaId_modality_isActive_idx" ON "checklist_templates"("empresaId", "modality", "isActive");

-- CreateIndex
CREATE INDEX "checklist_templates_empresaId_modality_isDefault_idx" ON "checklist_templates"("empresaId", "modality", "isDefault");

-- CreateIndex
CREATE INDEX "checklist_templates_createdBy_idx" ON "checklist_templates"("createdBy");

-- CreateIndex
CREATE INDEX "checklist_templates_deletedAt_idx" ON "checklist_templates"("deletedAt");

-- AddForeignKey
ALTER TABLE "checklist_templates" ADD CONSTRAINT "checklist_templates_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_templates" ADD CONSTRAINT "checklist_templates_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
