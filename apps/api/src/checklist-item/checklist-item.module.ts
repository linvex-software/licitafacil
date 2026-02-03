import { Module } from "@nestjs/common";
import { ChecklistItemController } from "./checklist-item.controller";
import { ChecklistItemService } from "./checklist-item.service";
import { PrismaModule } from "../prisma/prisma.module";
import { CommonModule } from "../common/common.module";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { BidModule } from "../bid/bid.module";
import { DocumentModule } from "../document/document.module";
import { AuthModule } from "../auth/auth.module";
import { UserModule } from "../user/user.module";
import { AssinaturaModule } from "../assinatura/assinatura.module";

@Module({
  imports: [
    PrismaModule,
    CommonModule,
    AuditLogModule,
    BidModule,
    DocumentModule,
    AuthModule,
    UserModule,
    AssinaturaModule,
  ],
  controllers: [ChecklistItemController],
  providers: [ChecklistItemService],
  exports: [ChecklistItemService],
})
export class ChecklistItemModule {}
