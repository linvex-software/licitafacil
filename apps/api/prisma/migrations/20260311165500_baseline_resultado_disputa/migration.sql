-- Baseline migration: reconcilia campos adicionados via db push
-- ResultadoDisputa enum e campos resultado/economiaGerada na tabela Disputa

CREATE TYPE "ResultadoDisputa" AS ENUM ('EM_ANDAMENTO', 'GANHOU', 'PERDEU', 'CANCELADO');

ALTER TABLE "Disputa" ADD COLUMN "resultado" "ResultadoDisputa" NOT NULL DEFAULT 'EM_ANDAMENTO';
ALTER TABLE "Disputa" ADD COLUMN "economiaGerada" DOUBLE PRECISION;
