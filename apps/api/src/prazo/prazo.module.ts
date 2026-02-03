import { Module } from "@nestjs/common";
import { PrazoController } from "./prazo.controller";
import { PrazoService } from "./prazo.service";
import { PrazoCriticalityService } from "./prazo-criticality.service";
import { PrismaModule } from "../prisma/prisma.module";
import { CommonModule } from "../common/common.module";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { BidModule } from "../bid/bid.module";
import { AuthModule } from "../auth/auth.module";
import { UserModule } from "../user/user.module";
import { AssinaturaModule } from "../assinatura/assinatura.module";

@Module({
  imports: [
    PrismaModule,
    CommonModule,
    AuditLogModule,
    BidModule,
    AuthModule,
    UserModule,
    AssinaturaModule,
  ],
  controllers: [PrazoController],
  providers: [PrazoService, PrazoCriticalityService],
  exports: [PrazoService, PrazoCriticalityService],
})
export class PrazoModule {}
