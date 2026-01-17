import { SetMetadata } from "@nestjs/common";

/**
 * Chave para armazenar metadados do decorator @Audit
 */
export const AUDIT_KEY = "audit";

/**
 * Opções para o decorator @Audit
 */
export interface AuditOptions {
  /**
   * Ação a ser registrada (ex: "auth.login", "licitacao.create")
   */
  action: string;

  /**
   * Tipo do recurso afetado (ex: "Licitacao", "Documento", "User")
   * Opcional: será inferido do controller se não fornecido
   */
  resourceType?: string;

  /**
   * Se true, captura o ID do recurso dos parâmetros da rota (ex: :id)
   * Opcional: padrão false
   */
  captureResourceId?: boolean;
}

/**
 * Decorator para marcar rotas que devem ser auditadas
 *
 * Uso:
 * @Audit({ action: "auth.login" })
 * @Audit({ action: "licitacao.create", resourceType: "Licitacao", captureResourceId: true })
 *
 * Requer que a rota esteja protegida com @UseGuards(JwtAuthGuard) para capturar userId/empresaId
 */
export const Audit = (options: AuditOptions) => SetMetadata(AUDIT_KEY, options);
