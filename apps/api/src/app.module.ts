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
import { ChecklistItemModule } from "./checklist-item/checklist-item.module";
import { PrazoModule } from "./prazo/prazo.module";
import { AlertModule } from "./alert/alert.module";
import { PlanoModule } from "./plano/plano.module";
import { AssinaturaModule } from "./assinatura/assinatura.module";

@Module({
  imports: [
    PrismaModule,
    PlanoModule,
    AssinaturaModule,
    EmpresaModule,
    UserModule,
    AuthModule,
    AuditLogModule,
    CommonModule,
    BidModule,
    DocumentModule,
    ChecklistTemplateModule,
    ChecklistItemModule,
    PrazoModule,
    AlertModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}

