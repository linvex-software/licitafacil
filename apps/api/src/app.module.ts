import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { BullModule } from "@nestjs/bull";
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
import { MonitoramentoModule } from "./monitoramento/monitoramento.module";
import { BillingModule } from "./billing/billing.module";

/**
 * Bull/ioredis.
 * Preferir `REDIS_URL` (Railway e outros provedores costumam injetar essa string completa).
 * Fallbacks sem underscore: `REDISHOST`, `REDISPORT`, `REDISPASSWORD`, `REDISUSER` (template Railway).
 */
function bullRedisOptions(): string | { host: string; port: number; password?: string; username?: string } {
  const url = process.env.REDIS_URL?.trim();
  if (url) return url;

  const rawPort = process.env.REDIS_PORT ?? process.env.REDISPORT ?? "6379";
  const parsedPort = parseInt(String(rawPort).trim(), 10);
  const port =
    Number.isFinite(parsedPort) && parsedPort > 0 && parsedPort < 65536
      ? parsedPort
      : 6379;

  const host =
    process.env.REDIS_HOST?.trim() ||
    process.env.REDISHOST?.trim() ||
    "localhost";
  const password =
    process.env.REDIS_PASSWORD?.trim() || process.env.REDISPASSWORD?.trim();
  const username =
    process.env.REDIS_USERNAME?.trim() || process.env.REDISUSER?.trim();

  const opts: { host: string; port: number; password?: string; username?: string } = { host, port };
  if (password) opts.password = password;
  if (username) opts.username = username;
  return opts;
}

@Module({
  imports: [
    BullModule.forRoot({
      redis: bullRedisOptions(),
    }),
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
    MonitoramentoModule,
    BillingModule,
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

