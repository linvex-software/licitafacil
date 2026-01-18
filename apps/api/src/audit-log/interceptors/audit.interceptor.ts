import {
  Injectable,
  type NestInterceptor,
  type ExecutionContext,
  type CallHandler,
} from "@nestjs/common";
import { type Observable } from "rxjs";
import { tap } from "rxjs/operators";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { Reflector } from "@nestjs/core";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { AuditLogService } from "../audit-log.service";
import { AUDIT_KEY, type AuditOptions } from "../decorators/audit.decorator";

/**
 * Interceptor para capturar e registrar logs de auditoria automaticamente
 *
 * Funciona em conjunto com o decorator @Audit() para marcar rotas que devem ser auditadas.
 *
 * Uso:
 * - Adicionar @UseInterceptors(AuditInterceptor) no controller ou método
 * - Adicionar @Audit({ action: "..." }) no método
 *
 * Requer que a rota esteja protegida com @UseGuards(JwtAuthGuard) para capturar userId/empresaId
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();

    // Obter opções do decorator @Audit
    const auditOptions = this.reflector.get(AUDIT_KEY, handler) as AuditOptions | undefined;

    // Se não há decorator @Audit, não auditar
    if (!auditOptions) {
      return next.handle();
    }

    // Extrair informações do request
    const user = request.user;
    const empresaId = user?.empresaId;
    const userId = user?.id;
    const ip = request.ip || request.connection?.remoteAddress || null;
    const userAgent = request.headers?.["user-agent"] || null;

    // Capturar resourceId se solicitado
    let resourceId: string | null = null;
    if (auditOptions.captureResourceId) {
      resourceId = request.params?.id || request.params?.resourceId || null;
    }

    // Inferir resourceType do controller se não fornecido
    let resourceType = auditOptions.resourceType;
    if (!resourceType) {
      const controllerName = context.getClass().name;
      // Remover sufixo "Controller" e converter para singular se necessário
      resourceType = controllerName.replace("Controller", "");
    }

    // Capturar metadata sanitizado (apenas campos seguros)
    const metadata = this.sanitizeMetadata(request.body, request.params);

    // Registrar log após sucesso da operação
    return next.handle().pipe(
      tap({
        next: async (response) => {
          // Se resourceId ainda não foi capturado, tentar pegar da resposta (para operações CREATE)
          let finalResourceId = resourceId;
          if (!finalResourceId && response && typeof response === "object" && "id" in response) {
            finalResourceId = (response as { id: string }).id;
          }

          // Registrar apenas se empresaId estiver disponível
          if (empresaId) {
            try {
              await this.auditLogService.record({
                empresaId,
                userId: userId || null,
                action: auditOptions.action,
                resourceType: resourceType || null,
                resourceId: finalResourceId || null,
                metadata: metadata || null,
                ip: ip || null,
                userAgent: userAgent || null,
              });
            } catch (error) {
              // Não falhar a requisição se o log falhar
              // Apenas logar o erro (em produção, usar logger adequado)
              console.error("Erro ao registrar log de auditoria:", error);
            }
          }
        },
        // Não registrar logs para erros (pode ser adicionado depois se necessário)
      }),
    );
  }

  /**
   * Sanitiza metadata removendo campos sensíveis (senhas, tokens, etc)
   */
  private sanitizeMetadata(body: any, params: any): Record<string, any> | null {
    if (!body && !params) {
      return null;
    }

    const metadata: Record<string, any> = {};

    // Campos sensíveis a remover (case-insensitive)
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
      "apikey",
      "privatekey",
      "private_key",
    ];

    // Adicionar body sanitizado (allowlist approach - apenas campos seguros conhecidos)
    if (body && typeof body === "object") {
      for (const [key, value] of Object.entries(body)) {
        const keyLower = key.toLowerCase();

        // Pular campos sensíveis
        if (sensitiveFields.includes(keyLower)) {
          continue;
        }

        // Limitar tamanho de strings para evitar logs muito grandes
        if (typeof value === "string" && value.length > 500) {
          metadata[key] = value.substring(0, 500) + "... (truncated)";
        } else if (typeof value === "object" && value !== null) {
          // Para objetos aninhados, não incluir (pode conter dados sensíveis)
          // Apenas incluir tipos primitivos seguros
          continue;
        } else {
          metadata[key] = value;
        }
      }
    }

    // Adicionar params (geralmente seguros, mas sanitizar também)
    if (params && typeof params === "object") {
      const safeParams: Record<string, any> = {};
      for (const [key, value] of Object.entries(params)) {
        const keyLower = key.toLowerCase();
        if (!sensitiveFields.includes(keyLower)) {
          safeParams[key] = value;
        }
      }
      if (Object.keys(safeParams).length > 0) {
        metadata.params = safeParams;
      }
    }

    return Object.keys(metadata).length > 0 ? metadata : null;
  }
}
