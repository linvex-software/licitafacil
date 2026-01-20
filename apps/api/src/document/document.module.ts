import { Module } from "@nestjs/common";
import { DocumentController } from "./document.controller";
import { DocumentService } from "./document.service";
import { PrismaModule } from "../prisma/prisma.module";
import { CommonModule } from "../common/common.module";
import { AuditLogModule } from "../audit-log/audit-log.module";

@Module({
  imports: [PrismaModule, CommonModule, AuditLogModule],
  controllers: [DocumentController],
  providers: [DocumentService],
  exports: [DocumentService],
})
export class DocumentModule {}
