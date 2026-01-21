-- AlterTable: Add risk management fields to Bid table
ALTER TABLE "bids" 
ADD COLUMN "riskReason" TEXT,
ADD COLUMN "lastRiskAnalysisAt" TIMESTAMP(3),
ADD COLUMN "manualRiskOverride" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "manualRiskOverrideBy" TEXT,
ADD COLUMN "manualRiskOverrideAt" TIMESTAMP(3);

-- CreateIndex: Add index for operational state filtering
CREATE INDEX "bids_empresaId_operationalState_idx" ON "bids"("empresaId", "operationalState");

-- AlterTable: Add category and isCritical fields to ChecklistItem table
ALTER TABLE "checklist_items"
ADD COLUMN "category" TEXT,
ADD COLUMN "isCritical" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex: Add indexes for critical items filtering
CREATE INDEX "checklist_items_empresaId_licitacaoId_isCritical_idx" ON "checklist_items"("empresaId", "licitacaoId", "isCritical");
CREATE INDEX "checklist_items_licitacaoId_concluido_idx" ON "checklist_items"("licitacaoId", "concluido");
