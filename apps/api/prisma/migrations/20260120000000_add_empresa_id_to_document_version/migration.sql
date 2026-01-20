-- Add empresaId to document_versions for multi-tenant isolation
-- This migration is idempotent: it checks if the column already exists

-- Add empresaId column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'document_versions'
        AND column_name = 'empresaId'
    ) THEN
        ALTER TABLE "document_versions" ADD COLUMN "empresaId" TEXT;
    END IF;
END $$;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'document_versions_empresaId_fkey'
    ) THEN
        ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_empresaId_fkey"
        FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Populate empresaId from parent document (if column was just added)
UPDATE "document_versions" dv
SET "empresaId" = d."empresaId"
FROM "documents" d
WHERE dv."documentId" = d.id
AND dv."empresaId" IS NULL;

-- Make empresaId NOT NULL after populating
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'document_versions'
        AND column_name = 'empresaId'
        AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE "document_versions" ALTER COLUMN "empresaId" SET NOT NULL;
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS "document_versions_empresaId_idx" ON "document_versions"("empresaId");
CREATE INDEX IF NOT EXISTS "document_versions_empresaId_documentId_idx" ON "document_versions"("empresaId", "documentId");
