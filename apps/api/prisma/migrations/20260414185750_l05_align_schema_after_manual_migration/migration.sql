-- DropForeignKey
ALTER TABLE "Disputa" DROP CONSTRAINT "Disputa_credencialId_fkey";

-- AddForeignKey
ALTER TABLE "Disputa" ADD CONSTRAINT "Disputa_credencialId_fkey" FOREIGN KEY ("credencialId") REFERENCES "CredencialPortal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
