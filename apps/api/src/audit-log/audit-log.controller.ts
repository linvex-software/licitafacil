import { Controller, Get, Post, Body, UseGuards, NotFoundException } from "@nestjs/common";
import { type AuditLogService } from "./audit-log.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Tenant } from "../common/decorators/tenant.decorator";

/**
 * Controller de auditoria
 *
 * IMPORTANTE: Endpoints DEV apenas para desenvolvimento.
 * Em produção, considerar proteção adicional (RBAC admin-only).
 */
@Controller("audit-logs")
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  /**
   * Lista logs de auditoria (apenas leitura)
   * GET /audit-logs
   *
   * Protegido por JWT e isolado por tenant
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async list(@Tenant() empresaId: string) {
    return this.auditLogService.list({
      empresaId,
      page: 1,
      limit: 50,
    });
  }
}

/**
 * Controller DEV temporário para testes de auditoria
 *
 * ATENÇÃO: Apenas em desenvolvimento (NODE_ENV=development)
 * Não deve ir para produção sem proteção adicional
 */
@Controller("dev")
export class DevAuditController {
  constructor(private readonly auditLogService: AuditLogService) {}

  /**
   * Endpoint DEV para testar auditoria
   * POST /dev/audit-test
   *
   * Apenas em desenvolvimento
   */
  @Post("audit-test")
  async testAudit(@Body() body: any) {
    // Bloquear em produção
    if (process.env.NODE_ENV !== "development") {
      throw new NotFoundException();
    }

    // Simular uma ação e registrar log
    const testEmpresaId = body.empresaId || "test-empresa-id";
    const testUserId = body.userId || null;

    await this.auditLogService.record({
      empresaId: testEmpresaId,
      userId: testUserId,
      action: "dev.audit-test",
      resourceType: "Test",
      resourceId: null,
      metadata: this.sanitizeTestMetadata(body),
      ip: null,
      userAgent: null,
    });

    return {
      message: "Log de auditoria criado com sucesso (DEV)",
      empresaId: testEmpresaId,
      timestamp: new Date().toISOString(),
    };
  }

  private sanitizeTestMetadata(body: any): Record<string, any> | null {
    if (!body || typeof body !== "object") {
      return null;
    }

    const sensitiveFields = [
      "password",
      "senha",
      "token",
      "accesstoken",
      "refreshtoken",
      "authorization",
      "cookie",
      "set-cookie",
      "secret",
    ];

    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(body)) {
      const keyLower = key.toLowerCase();
      if (sensitiveFields.includes(keyLower)) {
        continue;
      }

      if (typeof value === "string" && value.length > 500) {
        sanitized[key] = value.substring(0, 500) + "... (truncated)";
      } else if (typeof value === "object" && value !== null) {
        continue;
      } else {
        sanitized[key] = value;
      }
    }

    return Object.keys(sanitized).length > 0 ? sanitized : null;
  }
}
