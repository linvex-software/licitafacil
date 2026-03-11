import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bull";
import { PrismaModule } from "../prisma/prisma.module";
import { DisputaController } from "./disputa.controller";
import { DisputaService } from "./disputa.service";
import { DisputaGateway } from "./disputa.gateway";
import { DisputaProcessor } from "./disputa.processor";

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({ name: "disputa" }),
  ],
  controllers: [DisputaController],
  providers: [DisputaService, DisputaGateway, DisputaProcessor],
  exports: [DisputaService],
})
export class DisputaModule {}
