import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AlertController } from "./alert.controller";
import { AlertService } from "./alert.service";
import { AlertGeneratorService } from "./alert-generator.service";
import { AlertsGateway } from "./alerts.gateway";
import { PrismaModule } from "../prisma/prisma.module";
import { CommonModule } from "../common/common.module";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { AuthModule } from "../auth/auth.module";
import { UserModule } from "../user/user.module";
import { AssinaturaModule } from "../assinatura/assinatura.module";

@Module({
  imports: [
    PrismaModule,
    CommonModule,
    AuditLogModule,
    AuthModule,
    UserModule,
    AssinaturaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key-change-in-production",
      signOptions: { expiresIn: "24h" },
    }),
  ],
  controllers: [AlertController],
  providers: [AlertService, AlertGeneratorService, AlertsGateway],
  exports: [AlertService],
})
export class AlertModule {}

