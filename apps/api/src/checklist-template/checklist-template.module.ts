import { Module } from "@nestjs/common";
import { ChecklistTemplateController } from "./checklist-template.controller";
import { ChecklistTemplateService } from "./checklist-template.service";
import { PrismaModule } from "../prisma/prisma.module";
import { CommonModule } from "../common/common.module";
import { AuditLogModule } from "../audit-log/audit-log.module";

@Module({
  imports: [PrismaModule, CommonModule, AuditLogModule],
  controllers: [ChecklistTemplateController],
  providers: [ChecklistTemplateService],
  exports: [ChecklistTemplateService],
})
export class ChecklistTemplateModule {}
