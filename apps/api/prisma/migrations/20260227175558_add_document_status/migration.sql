-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDENTE', 'ATIVO');

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "status" "DocumentStatus" NOT NULL DEFAULT 'ATIVO';
