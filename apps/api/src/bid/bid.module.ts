import { Module } from "@nestjs/common";
import { BidController } from "./bid.controller";
import { BidService } from "./bid.service";
import { PrismaModule } from "../prisma/prisma.module";
import { CommonModule } from "../common/common.module";
import { AuditLogModule } from "../audit-log/audit-log.module";

@Module({
  imports: [PrismaModule, CommonModule, AuditLogModule],
  controllers: [BidController],
  providers: [BidService],
  exports: [BidService],
})
export class BidModule {}
