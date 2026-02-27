import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
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
import { AdminModule } from "./admin/admin.module";
import { EmailModule } from "./email/email.module";
import { RelatoriosModule } from "./relatorios/relatorios.module";
import { ComprasnetModule } from "./integracoes/comprasnet/comprasnet.module";
import { DiariosModule } from "./integracoes/diarios/diarios.module";
import { JuridicoModule } from "./juridico/juridico.module";
import { AnaliseModule } from "./analise/analise.module";
import { DisputaModule } from "./disputa/disputa.module";
import { NegociosModule } from "./negocios/negocios.module";

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        // 120 req/min por IP como baseline de proteção
        ttl: 60_000,
        limit: 120,
      },
    ]),
    PrismaModule,
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
    AdminModule,
    EmailModule,
    RelatoriosModule,
    ComprasnetModule,
    DiariosModule,
    JuridicoModule,
    AnaliseModule,
    DisputaModule,
    NegociosModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }

