import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { BullModule } from "@nestjs/bull";
import { PrismaModule } from "../prisma/prisma.module";
import { EmailModule } from "../email/email.module";
import { DisputaController } from "./disputa.controller";
import { DisputaService } from "./disputa.service";
import { DisputaGateway } from "./disputa.gateway";
import { DisputaProcessor } from "./disputa.processor";

@Module({
  imports: [
    PrismaModule,
    EmailModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key-change-in-production",
      signOptions: { expiresIn: "24h" },
    }),
    BullModule.registerQueue({ name: "disputa" }),
  ],
  controllers: [DisputaController],
  providers: [DisputaService, DisputaGateway, DisputaProcessor],
  exports: [DisputaService],
})
export class DisputaModule {}
