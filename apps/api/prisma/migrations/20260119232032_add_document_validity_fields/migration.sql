-- Add document validity fields (doesExpire, issuedAt, expiresAt)
-- This migration is idempotent: it checks if columns already exist
-- Retrocompatibilidade: documentos existentes terão doesExpire=false por padrão

-- Add doesExpire column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'documents'
        AND column_name = 'doesExpire'
    ) THEN
        ALTER TABLE "documents" ADD COLUMN "doesExpire" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- Add issuedAt column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'documents'
        AND column_name = 'issuedAt'
    ) THEN
        ALTER TABLE "documents" ADD COLUMN "issuedAt" TIMESTAMP(3);
    END IF;
END $$;

-- Add expiresAt column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'documents'
        AND column_name = 'expiresAt'
    ) THEN
        ALTER TABLE "documents" ADD COLUMN "expiresAt" TIMESTAMP(3);
    END IF;
END $$;

-- Create index for validity queries (tenantId + expiresAt)
-- This index is crucial for dashboard queries and expiration checks
CREATE INDEX IF NOT EXISTS "documents_empresaId_expiresAt_idx" ON "documents"("empresaId", "expiresAt");

-- Add check constraint: if doesExpire=false, expiresAt must be NULL
-- This constraint ensures data integrity at the database level
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'documents_validity_check'
    ) THEN
        ALTER TABLE "documents" ADD CONSTRAINT "documents_validity_check"
        CHECK (
            ("doesExpire" = false AND "expiresAt" IS NULL) OR
            ("doesExpire" = true AND "expiresAt" IS NOT NULL)
        );
    END IF;
END $$;

-- Add check constraint: expiresAt must be > issuedAt when both exist
-- This constraint ensures logical consistency
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'documents_expires_after_issued_check'
    ) THEN
        ALTER TABLE "documents" ADD CONSTRAINT "documents_expires_after_issued_check"
        CHECK (
            "issuedAt" IS NULL OR
            "expiresAt" IS NULL OR
            "expiresAt" > "issuedAt"
        );
    END IF;
END $$;
