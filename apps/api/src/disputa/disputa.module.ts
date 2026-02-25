import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { DisputaController } from "./disputa.controller";
import { DisputaService } from "./disputa.service";

@Module({
  imports: [PrismaModule],
  controllers: [DisputaController],
  providers: [DisputaService],
  exports: [DisputaService],
})
export class DisputaModule {}
