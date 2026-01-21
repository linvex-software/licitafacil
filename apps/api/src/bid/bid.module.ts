import { Module } from "@nestjs/common";
import { BidController } from "./bid.controller";
import { BidService } from "./bid.service";
import { BidRiskService } from "./bid-risk.service";
import { PrismaModule } from "../prisma/prisma.module";
import { CommonModule } from "../common/common.module";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { DocumentModule } from "../document/document.module";

@Module({
  imports: [PrismaModule, CommonModule, AuditLogModule, DocumentModule],
  controllers: [BidController],
  providers: [BidService, BidRiskService],
  exports: [BidService, BidRiskService],
})
export class BidModule {}
