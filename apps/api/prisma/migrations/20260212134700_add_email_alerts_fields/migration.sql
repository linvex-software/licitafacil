-- AlterTable: Adicionar campos de notificação por email na tabela users
ALTER TABLE "users" ADD COLUMN "receberEmails" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN "receberDocVencendo" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN "receberPrazoCritico" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN "receberRisco" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN "frequenciaEmail" TEXT NOT NULL DEFAULT 'IMEDIATO';
ALTER TABLE "users" ADD COLUMN "unsubscribeToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_unsubscribeToken_key" ON "users"("unsubscribeToken");

-- AlterTable: Adicionar campos de alerta de vencimento na tabela documents
ALTER TABLE "documents" ADD COLUMN "alertaVencimentoEnviado" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "documents" ADD COLUMN "alertaVencimentoEnviadoEm" TIMESTAMP(3);

-- AlterTable: Adicionar campos de alerta de prazo e risco na tabela bids
ALTER TABLE "bids" ADD COLUMN "alertaPrazoEnviado" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "bids" ADD COLUMN "alertaPrazoEnviadoEm" TIMESTAMP(3);
ALTER TABLE "bids" ADD COLUMN "alertaRiscoEnviado" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "bids" ADD COLUMN "alertaRiscoEnviadoEm" TIMESTAMP(3);
