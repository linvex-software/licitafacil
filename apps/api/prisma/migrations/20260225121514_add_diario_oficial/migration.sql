-- CreateTable
CREATE TABLE "diarios_oficiais" (
    "id" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "municipio" TEXT,
    "url" TEXT NOT NULL,
    "ultimaSincronizacao" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "diarios_oficiais_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "diarios_oficiais_estado_municipio_idx" ON "diarios_oficiais"("estado", "municipio");

-- CreateIndex
CREATE INDEX "diarios_oficiais_deletedAt_idx" ON "diarios_oficiais"("deletedAt");
