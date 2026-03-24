-- CreateEnum
CREATE TYPE "StatusItemDisputa" AS ENUM ('AGUARDANDO', 'ABERTO', 'ENCERRAMENTO_ALEATORIO', 'ENCERRADO');

-- CreateEnum
CREATE TYPE "OrigemLanceHistorico" AS ENUM ('MANUAL', 'EXTENSAO');

-- AlterEnum
ALTER TYPE "ResultadoDisputa" ADD VALUE 'DESISTIU';

-- AlterTable
ALTER TABLE "ConfiguracaoLance" ADD COLUMN     "melhorLance" DECIMAL(15,2),
ADD COLUMN     "posicaoAtual" INTEGER,
ADD COLUMN     "statusItem" "StatusItemDisputa" NOT NULL DEFAULT 'AGUARDANDO',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "valorFinal" DECIMAL(15,2),
ADD COLUMN     "vencedor" TEXT;

-- AlterTable
ALTER TABLE "Disputa" ADD COLUMN     "criadoPorId" TEXT,
ADD COLUMN     "numeroPregao" TEXT NOT NULL DEFAULT 'NI',
ADD COLUMN     "uasg" TEXT NOT NULL DEFAULT 'NI',
ALTER COLUMN "credencialId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "HistoricoLance" ADD COLUMN     "itemDisputaId" TEXT,
ADD COLUMN     "operadorId" TEXT,
ADD COLUMN     "origem" "OrigemLanceHistorico" NOT NULL DEFAULT 'MANUAL';

-- CreateIndex
CREATE INDEX "ConfiguracaoLance_disputaId_itemNumero_idx" ON "ConfiguracaoLance"("disputaId", "itemNumero");

-- CreateIndex
CREATE INDEX "Disputa_empresaId_status_idx" ON "Disputa"("empresaId", "status");

-- CreateIndex
CREATE INDEX "Disputa_criadoPorId_idx" ON "Disputa"("criadoPorId");

-- CreateIndex
CREATE INDEX "HistoricoLance_disputaId_timestamp_idx" ON "HistoricoLance"("disputaId", "timestamp");

-- CreateIndex
CREATE INDEX "HistoricoLance_itemDisputaId_idx" ON "HistoricoLance"("itemDisputaId");

-- AddForeignKey
ALTER TABLE "Disputa" ADD CONSTRAINT "Disputa_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricoLance" ADD CONSTRAINT "HistoricoLance_itemDisputaId_fkey" FOREIGN KEY ("itemDisputaId") REFERENCES "ConfiguracaoLance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricoLance" ADD CONSTRAINT "HistoricoLance_operadorId_fkey" FOREIGN KEY ("operadorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
