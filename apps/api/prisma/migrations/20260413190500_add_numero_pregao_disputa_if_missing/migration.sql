-- Garante colunas usadas pelo DisputaService em bancos que não aplicaram a migration L02 completa.
-- IF NOT EXISTS evita falha em ambientes que já possuem as colunas.

ALTER TABLE "Disputa" ADD COLUMN IF NOT EXISTS "numeroPregao" TEXT NOT NULL DEFAULT 'NI';
ALTER TABLE "Disputa" ADD COLUMN IF NOT EXISTS "uasg" TEXT NOT NULL DEFAULT 'NI';
