-- CreateEnum
CREATE TYPE "PortalLicitacao" AS ENUM ('COMPRASNET', 'BNC');

-- CreateEnum
CREATE TYPE "DisputaStatus" AS ENUM ('AGENDADA', 'INICIANDO', 'AO_VIVO', 'PAUSADA', 'ENCERRADA', 'CANCELADA', 'ERRO');

-- CreateEnum
CREATE TYPE "EstrategiaLance" AS ENUM ('AGRESSIVA', 'CONSERVADORA', 'POR_MARGEM');

-- CreateEnum
CREATE TYPE "EventoDisputa" AS ENUM ('LANCE_ENVIADO', 'POSICAO_ATUALIZADA', 'SESSAO_ENCERRADA', 'CAPTCHA_DETECTADO', 'ERRO', 'PAUSADA', 'RETOMADA', 'LANCE_MANUAL');

-- CreateTable
CREATE TABLE "Disputa" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "bidId" TEXT,
    "portal" "PortalLicitacao" NOT NULL,
    "status" "DisputaStatus" NOT NULL DEFAULT 'AGENDADA',
    "agendadoPara" TIMESTAMP(3),
    "iniciadoEm" TIMESTAMP(3),
    "encerradoEm" TIMESTAMP(3),
    "credencialId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Disputa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CredencialPortal" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "portal" "PortalLicitacao" NOT NULL,
    "cnpj" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CredencialPortal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfiguracaoLance" (
    "id" TEXT NOT NULL,
    "disputaId" TEXT NOT NULL,
    "itemNumero" INTEGER NOT NULL,
    "itemDescricao" TEXT,
    "valorMaximo" DECIMAL(15,2) NOT NULL,
    "valorMinimo" DECIMAL(15,2) NOT NULL,
    "estrategia" "EstrategiaLance" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConfiguracaoLance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoricoLance" (
    "id" TEXT NOT NULL,
    "disputaId" TEXT NOT NULL,
    "itemNumero" INTEGER NOT NULL,
    "valorEnviado" DECIMAL(15,2),
    "melhorLance" DECIMAL(15,2),
    "posicao" INTEGER,
    "evento" "EventoDisputa" NOT NULL,
    "detalhe" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoricoLance_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Disputa" ADD CONSTRAINT "Disputa_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disputa" ADD CONSTRAINT "Disputa_bidId_fkey" FOREIGN KEY ("bidId") REFERENCES "bids"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disputa" ADD CONSTRAINT "Disputa_credencialId_fkey" FOREIGN KEY ("credencialId") REFERENCES "CredencialPortal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CredencialPortal" ADD CONSTRAINT "CredencialPortal_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfiguracaoLance" ADD CONSTRAINT "ConfiguracaoLance_disputaId_fkey" FOREIGN KEY ("disputaId") REFERENCES "Disputa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricoLance" ADD CONSTRAINT "HistoricoLance_disputaId_fkey" FOREIGN KEY ("disputaId") REFERENCES "Disputa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
