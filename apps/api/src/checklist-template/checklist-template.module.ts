import { Module } from "@nestjs/common";
import { ChecklistTemplateController } from "./checklist-template.controller";
import { ChecklistTemplateService } from "./checklist-template.service";
import { PrismaModule } from "../prisma/prisma.module";
import { CommonModule } from "../common/common.module";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { AssinaturaModule } from "../assinatura/assinatura.module";

@Module({
  imports: [PrismaModule, CommonModule, AuditLogModule, AssinaturaModule],
  controllers: [ChecklistTemplateController],
  providers: [ChecklistTemplateService],
  exports: [ChecklistTemplateService],
})
export class ChecklistTemplateModule {}
