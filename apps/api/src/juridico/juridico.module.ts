import { Module } from "@nestjs/common";
import { JuridicoController } from "./juridico.controller";
import { JuridicoService } from "./juridico.service";
import { PrismaModule } from "../prisma/prisma.module";
import { BidModule } from "../bid/bid.module";
import { ConfigModule } from "@nestjs/config";

@Module({
  imports: [PrismaModule, BidModule, ConfigModule],
  controllers: [JuridicoController],
  providers: [JuridicoService],
  exports: [JuridicoService],
})
export class JuridicoModule {}
