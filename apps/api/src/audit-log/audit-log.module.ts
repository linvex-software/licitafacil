import { Module } from "@nestjs/common";
import { AuditLogService } from "./audit-log.service";
import { AuditInterceptor } from "./interceptors/audit.interceptor";
import { AuditLogController, DevAuditController } from "./audit-log.controller";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [AuditLogController, DevAuditController],
  providers: [AuditLogService, AuditInterceptor],
  exports: [AuditLogService, AuditInterceptor], // Exportar para uso em outros módulos
})
export class AuditLogModule {}
