-- CreateTable
-- Tabela para itens de checklist de licitações
-- Cada item representa uma tarefa obrigatória que, se não for feita corretamente, pode eliminar o fornecedor
CREATE TABLE IF NOT EXISTS "checklist_items" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "licitacaoId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "exigeEvidencia" BOOLEAN NOT NULL DEFAULT false,
    "concluido" BOOLEAN NOT NULL DEFAULT false,
    "concluidoPor" TEXT,
    "concluidoEm" TIMESTAMP(3),
    -- DECISÃO DE DOMÍNIO: Evidência é EXCLUSIVA por item (um documento = uma evidência de um único item)
    -- Isso garante rastreabilidade clara: cada item tem sua própria comprovação específica
    "evidenciaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "checklist_items_empresaId_idx" ON "checklist_items"("empresaId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "checklist_items_empresaId_licitacaoId_idx" ON "checklist_items"("empresaId", "licitacaoId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "checklist_items_empresaId_deletedAt_idx" ON "checklist_items"("empresaId", "deletedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "checklist_items_licitacaoId_idx" ON "checklist_items"("licitacaoId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "checklist_items_concluidoPor_idx" ON "checklist_items"("concluidoPor");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "checklist_items_evidenciaId_idx" ON "checklist_items"("evidenciaId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "checklist_items_deletedAt_idx" ON "checklist_items"("deletedAt");

-- CreateUniqueIndex
-- Garante que um documento só pode ser evidência de um único item (relacionamento exclusivo)
CREATE UNIQUE INDEX IF NOT EXISTS "checklist_items_evidenciaId_key" ON "checklist_items"("evidenciaId");

-- AddForeignKey
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_licitacaoId_fkey" FOREIGN KEY ("licitacaoId") REFERENCES "bids"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_concluidoPor_fkey" FOREIGN KEY ("concluidoPor") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
-- Relacionamento exclusivo: um documento pode ser evidência de exatamente um item
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_evidenciaId_fkey" FOREIGN KEY ("evidenciaId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
