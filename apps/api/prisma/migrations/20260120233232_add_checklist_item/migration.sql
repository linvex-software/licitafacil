-- CreateTable
CREATE TABLE "checklist_items" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "licitacaoId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "exigeEvidencia" BOOLEAN NOT NULL DEFAULT false,
    "concluido" BOOLEAN NOT NULL DEFAULT false,
    "concluidoPor" TEXT,
    "concluidoEm" TIMESTAMP(3),
    "evidenciaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "checklist_items_evidenciaId_key" ON "checklist_items"("evidenciaId");

-- CreateIndex
CREATE INDEX "checklist_items_empresaId_idx" ON "checklist_items"("empresaId");

-- CreateIndex
CREATE INDEX "checklist_items_empresaId_licitacaoId_idx" ON "checklist_items"("empresaId", "licitacaoId");

-- CreateIndex
CREATE INDEX "checklist_items_empresaId_deletedAt_idx" ON "checklist_items"("empresaId", "deletedAt");

-- CreateIndex
CREATE INDEX "checklist_items_licitacaoId_idx" ON "checklist_items"("licitacaoId");

-- CreateIndex
CREATE INDEX "checklist_items_concluidoPor_idx" ON "checklist_items"("concluidoPor");

-- CreateIndex
CREATE INDEX "checklist_items_evidenciaId_idx" ON "checklist_items"("evidenciaId");

-- CreateIndex
CREATE INDEX "checklist_items_deletedAt_idx" ON "checklist_items"("deletedAt");

-- AddForeignKey
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_licitacaoId_fkey" FOREIGN KEY ("licitacaoId") REFERENCES "bids"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_concluidoPor_fkey" FOREIGN KEY ("concluidoPor") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_evidenciaId_fkey" FOREIGN KEY ("evidenciaId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
