import { Global, Module } from "@nestjs/common";
import { SoftDeleteService } from "./services/soft-delete.service";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { FeatureAccessGuard } from "./guards/feature-access.guard";
import { ClienteConfigCacheService } from "./services/cliente-config-cache.service";

/**
 * Módulo comum para serviços compartilhados
 *
 * @Global() - Disponibiliza serviços em todos os módulos sem precisar importar
 */
@Global()
@Module({
  imports: [AuditLogModule], // SoftDeleteService depende do AuditLogService
  providers: [SoftDeleteService, ClienteConfigCacheService, FeatureAccessGuard],
  exports: [SoftDeleteService, ClienteConfigCacheService, FeatureAccessGuard],
})
export class CommonModule {}
