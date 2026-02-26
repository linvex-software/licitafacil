-- CreateTable
CREATE TABLE "chat_historicos" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "bidId" TEXT NOT NULL,
    "pergunta" TEXT NOT NULL,
    "resposta" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_historicos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chat_historicos_empresaId_bidId_idx" ON "chat_historicos"("empresaId", "bidId");

-- AddForeignKey
ALTER TABLE "chat_historicos" ADD CONSTRAINT "chat_historicos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_historicos" ADD CONSTRAINT "chat_historicos_bidId_fkey" FOREIGN KEY ("bidId") REFERENCES "bids"("id") ON DELETE CASCADE ON UPDATE CASCADE;
