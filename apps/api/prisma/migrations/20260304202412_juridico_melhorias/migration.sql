-- CreateEnum
CREATE TYPE "EscopoImpugnacao" AS ENUM ('TOTAL', 'PARCIAL');

-- CreateEnum
CREATE TYPE "EfeitoRecurso" AS ENUM ('SUSPENSIVO', 'DEVOLUTIVO', 'NAO_APLICA');

-- CreateEnum
CREATE TYPE "AutorTipo" AS ENUM ('CONCORRENTE', 'CIDADAO', 'ORGAO');

-- CreateEnum
CREATE TYPE "TipoEventoLicitacao" AS ENUM ('EDITAL_PUBLICADO', 'SESSAO_ABERTA', 'ESCLARECIMENTO_PUBLICADO', 'ADENDO_EMITIDO', 'PRAZO_PROPOSTA_REABERTO', 'JULGAMENTO_ENCERRADO', 'JANELA_RECURSO_ABERTA', 'JANELA_RECURSO_ENCERRADA', 'INTENCAO_RECURSO_REGISTRADA', 'RECURSO_INTERPOSTO', 'RECURSO_DECIDIDO', 'CONTRA_RAZOES_APRESENTADAS', 'SUSPENSA_POR_RECURSO', 'SUSPENSAO_ENCERRADA', 'HABILITACAO_ANALISADA', 'INABILITACAO_REGISTRADA', 'ADJUDICACAO', 'HOMOLOGACAO', 'HOMOLOGACAO_ANULADA', 'REVOGACAO', 'IMPUGNACAO_RECEBIDA', 'IMPUGNACAO_DECIDIDA');

-- CreateEnum
CREATE TYPE "StatusEsclarecimento" AS ENUM ('NORMAL', 'ADENDO_EMITIDO', 'PRAZO_REABERTO');

-- AlterTable
ALTER TABLE "bids" ADD COLUMN     "dataAdjudicacao" TIMESTAMP(3),
ADD COLUMN     "dataHomologacao" TIMESTAMP(3),
ADD COLUMN     "isVencedorProvisorio" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "janelaIntencaoRecursoTermino" TIMESTAMP(3),
ADD COLUMN     "statusEsclarecimento" "StatusEsclarecimento" NOT NULL DEFAULT 'NORMAL';

-- AlterTable
ALTER TABLE "peticoes" ADD COLUMN     "anonimo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "autorTipo" "AutorTipo" NOT NULL DEFAULT 'CONCORRENTE',
ADD COLUMN     "efeitoRecurso" "EfeitoRecurso" NOT NULL DEFAULT 'NAO_APLICA',
ADD COLUMN     "escopoImpugnacao" "EscopoImpugnacao",
ADD COLUMN     "itensContestados" TEXT,
ADD COLUMN     "motivoIntencao" TEXT;

-- CreateTable
CREATE TABLE "eventos_licitacao" (
    "id" TEXT NOT NULL,
    "bidId" TEXT NOT NULL,
    "tipo" "TipoEventoLicitacao" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "detalhes" JSONB,
    "criadoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eventos_licitacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "eventos_licitacao_bidId_idx" ON "eventos_licitacao"("bidId");

-- CreateIndex
CREATE INDEX "eventos_licitacao_timestamp_idx" ON "eventos_licitacao"("timestamp");

-- AddForeignKey
ALTER TABLE "eventos_licitacao" ADD CONSTRAINT "eventos_licitacao_bidId_fkey" FOREIGN KEY ("bidId") REFERENCES "bids"("id") ON DELETE CASCADE ON UPDATE CASCADE;
