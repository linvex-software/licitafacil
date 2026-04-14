-- AlterTable
ALTER TABLE "Disputa"
ADD COLUMN     "valorFinal" DECIMAL(15,2),
ADD COLUMN     "observacaoResultado" TEXT,
ADD COLUMN     "totalLancesEnviados" INTEGER,
ADD COLUMN     "menorLanceEnviado" DECIMAL(15,2),
ADD COLUMN     "melhorLanceGlobal" DECIMAL(15,2),
ADD COLUMN     "margemVsMelhorLance" DECIMAL(15,2);

