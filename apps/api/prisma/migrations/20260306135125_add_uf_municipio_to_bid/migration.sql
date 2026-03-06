-- AlterTable
ALTER TABLE "bids" ADD COLUMN     "municipio" TEXT,
ADD COLUMN     "uf" TEXT NOT NULL DEFAULT 'NI';
