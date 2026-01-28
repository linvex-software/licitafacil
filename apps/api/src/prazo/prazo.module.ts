import { Module } from "@nestjs/common";
import { PrazoController } from "./prazo.controller";
import { PrazoService } from "./prazo.service";
import { PrismaModule } from "../prisma/prisma.module";
import { CommonModule } from "../common/common.module";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { BidModule } from "../bid/bid.module";
import { AuthModule } from "../auth/auth.module";
import { UserModule } from "../user/user.module";

@Module({
  imports: [
    PrismaModule,
    CommonModule,
    AuditLogModule,
    BidModule,
    AuthModule,
    UserModule,
  ],
  controllers: [PrazoController],
  providers: [PrazoService],
  exports: [PrazoService],
})
export class PrazoModule {}
