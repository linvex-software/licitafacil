-- CreateEnum
CREATE TYPE "CicloCobranca" AS ENUM ('SEMIANNUAL', 'ANNUAL');

-- CreateEnum
CREATE TYPE "AssinaturaStatus" AS ENUM ('PENDING', 'ACTIVE', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FaturaStatus" AS ENUM ('PENDING', 'CONFIRMED', 'RECEIVED', 'OVERDUE', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MetodoPagamento" AS ENUM ('PIX', 'CREDIT_CARD', 'BOLETO');

-- DropForeignKey
ALTER TABLE "Disputa" DROP CONSTRAINT "Disputa_credencialId_fkey";

-- CreateTable
CREATE TABLE "clientes_asaas" (
    "id" TEXT NOT NULL,
    "asaasCustomerId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "cpfCnpj" TEXT NOT NULL,
    "telefone" TEXT,
    "empresaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_asaas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assinaturas" (
    "id" TEXT NOT NULL,
    "asaasSubscriptionId" TEXT,
    "plano" "PlanoTipo" NOT NULL,
    "ciclo" "CicloCobranca" NOT NULL,
    "status" "AssinaturaStatus" NOT NULL DEFAULT 'PENDING',
    "valorMensal" DOUBLE PRECISION NOT NULL,
    "valorTotal" DOUBLE PRECISION NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataFim" TIMESTAMP(3),
    "clienteAsaasId" TEXT NOT NULL,
    "empresaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assinaturas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faturas" (
    "id" TEXT NOT NULL,
    "asaasPaymentId" TEXT,
    "valor" DOUBLE PRECISION NOT NULL,
    "status" "FaturaStatus" NOT NULL DEFAULT 'PENDING',
    "metodo" "MetodoPagamento",
    "dataPagamento" TIMESTAMP(3),
    "dataVencimento" TIMESTAMP(3),
    "pixQrCode" TEXT,
    "pixCopiaECola" TEXT,
    "invoiceUrl" TEXT,
    "assinaturaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faturas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clientes_asaas_asaasCustomerId_key" ON "clientes_asaas"("asaasCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_asaas_empresaId_key" ON "clientes_asaas"("empresaId");

-- CreateIndex
CREATE INDEX "clientes_asaas_email_idx" ON "clientes_asaas"("email");

-- CreateIndex
CREATE INDEX "clientes_asaas_cpfCnpj_idx" ON "clientes_asaas"("cpfCnpj");

-- CreateIndex
CREATE UNIQUE INDEX "assinaturas_asaasSubscriptionId_key" ON "assinaturas"("asaasSubscriptionId");

-- CreateIndex
CREATE INDEX "assinaturas_clienteAsaasId_idx" ON "assinaturas"("clienteAsaasId");

-- CreateIndex
CREATE INDEX "assinaturas_empresaId_idx" ON "assinaturas"("empresaId");

-- CreateIndex
CREATE INDEX "assinaturas_status_idx" ON "assinaturas"("status");

-- CreateIndex
CREATE UNIQUE INDEX "faturas_asaasPaymentId_key" ON "faturas"("asaasPaymentId");

-- CreateIndex
CREATE INDEX "faturas_assinaturaId_idx" ON "faturas"("assinaturaId");

-- CreateIndex
CREATE INDEX "faturas_status_idx" ON "faturas"("status");

-- AddForeignKey
ALTER TABLE "clientes_asaas" ADD CONSTRAINT "clientes_asaas_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assinaturas" ADD CONSTRAINT "assinaturas_clienteAsaasId_fkey" FOREIGN KEY ("clienteAsaasId") REFERENCES "clientes_asaas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assinaturas" ADD CONSTRAINT "assinaturas_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faturas" ADD CONSTRAINT "faturas_assinaturaId_fkey" FOREIGN KEY ("assinaturaId") REFERENCES "assinaturas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disputa" ADD CONSTRAINT "Disputa_credencialId_fkey" FOREIGN KEY ("credencialId") REFERENCES "CredencialPortal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
