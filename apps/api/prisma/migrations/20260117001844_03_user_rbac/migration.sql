-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'COLABORADOR');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'COLABORADOR';

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");
