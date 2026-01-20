import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { HealthController } from "./health/health.controller";
import { PrismaModule } from "./prisma/prisma.module";
import { EmpresaModule } from "./empresa/empresa.module";
import { UserModule } from "./user/user.module";
import { AuthModule } from "./auth/auth.module";
import { AuditLogModule } from "./audit-log/audit-log.module";
import { CommonModule } from "./common/common.module";
import { BidModule } from "./bid/bid.module";
import { DocumentModule } from "./document/document.module";
import { ChecklistTemplateModule } from "./checklist-template/checklist-template.module";

@Module({
  imports: [
    PrismaModule,
    EmpresaModule,
    UserModule,
    AuthModule,
    AuditLogModule,
    CommonModule,
    BidModule,
    DocumentModule,
    ChecklistTemplateModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}

