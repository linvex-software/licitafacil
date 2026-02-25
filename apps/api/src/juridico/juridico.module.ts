import { Module } from "@nestjs/common";
import { JuridicoController } from "./juridico.controller";
import { JuridicoService } from "./juridico.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [JuridicoController],
  providers: [JuridicoService],
  exports: [JuridicoService],
})
export class JuridicoModule {}
