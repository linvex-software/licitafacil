import { Module } from "@nestjs/common";
import { AssinaturaService } from "./assinatura.service";
import { AssinaturaController } from "./assinatura.controller";
import { AssinaturaAtivaGuard } from "./assinatura.guard";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [AssinaturaController],
  providers: [AssinaturaService, AssinaturaAtivaGuard],
  exports: [AssinaturaService, AssinaturaAtivaGuard],
})
export class AssinaturaModule {}
