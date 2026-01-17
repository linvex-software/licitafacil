import { Module } from "@nestjs/common";
import { AuditLogService } from "./audit-log.service";
import { AuditInterceptor } from "./interceptors/audit.interceptor";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  providers: [AuditLogService, AuditInterceptor],
  exports: [AuditLogService, AuditInterceptor], // Exportar para uso em outros módulos
})
export class AuditLogModule {}
