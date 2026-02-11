-- CreateEnum
CREATE TYPE "ContratoStatus" AS ENUM ('TRIAL', 'ATIVO', 'SUSPENSO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "TipoPagamento" AS ENUM ('SETUP', 'MENSALIDADE', 'EXTRA');

-- CreateTable
CREATE TABLE "contratos" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "planoNome" TEXT NOT NULL,
    "valorSetup" DECIMAL(10,2) NOT NULL,
    "valorMensalidade" DECIMAL(10,2) NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "proximoVencimento" TIMESTAMP(3) NOT NULL,
    "status" "ContratoStatus" NOT NULL DEFAULT 'TRIAL',
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contratos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagamentos" (
    "id" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "tipo" "TipoPagamento" NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "dataPrevista" TIMESTAMP(3) NOT NULL,
    "dataPago" TIMESTAMP(3),
    "metodoPagamento" TEXT,
    "comprovanteUrl" TEXT,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pagamentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contratos_empresaId_key" ON "contratos"("empresaId");

-- CreateIndex
CREATE INDEX "contratos_status_idx" ON "contratos"("status");

-- CreateIndex
CREATE INDEX "contratos_proximoVencimento_idx" ON "contratos"("proximoVencimento");

-- CreateIndex
CREATE INDEX "pagamentos_contratoId_idx" ON "pagamentos"("contratoId");

-- CreateIndex
CREATE INDEX "pagamentos_dataPrevista_idx" ON "pagamentos"("dataPrevista");

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contratos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
