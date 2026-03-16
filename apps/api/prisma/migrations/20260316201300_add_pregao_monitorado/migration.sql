-- CreateEnum
CREATE TYPE "PortalMonitoramento" AS ENUM ('PNCP', 'COMPRASNET', 'LICITAR_DIGITAL', 'BNC');

-- CreateEnum
CREATE TYPE "StatusPregao" AS ENUM ('AGUARDANDO', 'EM_DISPUTA', 'ENCERRADO', 'CANCELADO');

-- CreateTable
CREATE TABLE "PregaoMonitorado" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "portal" "PortalMonitoramento" NOT NULL,
    "status" "StatusPregao" NOT NULL DEFAULT 'AGUARDANDO',
    "numeroPregao" TEXT NOT NULL,
    "objeto" TEXT NOT NULL,
    "orgao" TEXT,
    "horarioInicio" TIMESTAMP(3) NOT NULL,
    "horarioFim" TIMESTAMP(3),
    "urlSalaDisputa" TEXT NOT NULL,
    "linkPncp" TEXT,
    "melhorLance" DOUBLE PRECISION,
    "alertaEnviado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PregaoMonitorado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PregaoMonitorado_empresaId_status_idx" ON "PregaoMonitorado"("empresaId", "status");

-- CreateIndex
CREATE INDEX "PregaoMonitorado_horarioInicio_idx" ON "PregaoMonitorado"("horarioInicio");

-- AddForeignKey
ALTER TABLE "PregaoMonitorado" ADD CONSTRAINT "PregaoMonitorado_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
