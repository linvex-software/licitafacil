-- CreateEnum
CREATE TYPE "ResultadoPregao" AS ENUM ('GANHOU', 'PERDEU', 'DESISTIU', 'PENDENTE');

-- CreateEnum
CREATE TYPE "FonteValorReferenciaPregao" AS ENUM ('PNCP', 'EDITAL', 'MANUAL');

-- AlterTable
ALTER TABLE "PregaoMonitorado" ADD COLUMN     "finalizadoEm" TIMESTAMP(3),
ADD COLUMN     "fonteValorReferencia" "FonteValorReferenciaPregao",
ADD COLUMN     "observacao" TEXT,
ADD COLUMN     "resultado" "ResultadoPregao" NOT NULL DEFAULT 'PENDENTE',
ADD COLUMN     "valorFinal" DOUBLE PRECISION,
ADD COLUMN     "valorReferencia" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "PregaoMonitorado_empresaId_resultado_idx" ON "PregaoMonitorado"("empresaId", "resultado");
