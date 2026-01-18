import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditLogService } from "../../audit-log/audit-log.service";

/**
 * Tipos de recursos que podem ser deletados via soft delete
 */
export type SoftDeletableResource = "user" | "empresa" | "bid";

/**
 * Interface para metadata sanitizada do recurso deletado
 */
interface ResourceMetadata {
  id: string;
  [key: string]: any;
}

/**
 * Serviço para realizar soft delete com auditoria automática
 *
 * IMPORTANTE: Este serviço substitui os métodos delete() e deleteMany()
 * do Prisma, garantindo que:
 * 1. Apenas soft delete seja realizado (nunca hard delete)
 * 2. Logs de auditoria sejam registrados automaticamente
 * 3. Isolamento por tenant seja respeitado
 */
@Injectable()
export class SoftDeleteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Mapeia o tipo de recurso para o nome usado no audit log
   */
  private getResourceTypeForAudit(resource: SoftDeletableResource): string {
    const mapping: Record<SoftDeletableResource, string> = {
      user: "User",
      empresa: "Empresa",
      bid: "Bid",
    };
    return mapping[resource];
  }

  /**
   * Mapeia o tipo de recurso para a action do audit log
   */
  private getActionForAudit(resource: SoftDeletableResource): string {
    return `${resource}.delete`;
  }

  /**
   * Sanitiza metadata do recurso para o audit log
   * Remove campos sensíveis como senhas
   */
  private sanitizeMetadata(metadata: ResourceMetadata): Record<string, any> {
    const sanitized = { ...metadata };
    
    // Remover campos sensíveis
    delete sanitized.password;
    delete sanitized.accessToken;
    delete sanitized.refreshToken;
    delete sanitized.token;

    return sanitized;
  }

  /**
   * Realiza soft delete de um recurso (marca deletedAt)
   * 
   * @param resource - Tipo do recurso a ser deletado
   * @param id - ID do recurso
   * @param empresaId - ID da empresa (tenant)
   * @param userId - ID do usuário que está deletando (opcional)
   * @param request - Request object para capturar IP/userAgent (opcional)
   * @returns O recurso deletado (com deletedAt preenchido)
   */
  async delete<T = any>(
    resource: SoftDeletableResource,
    id: string,
    empresaId: string,
    userId?: string | null,
    request?: any,
  ): Promise<T> {
    // Buscar o recurso antes de deletar (para auditoria e validação)
    // Usa Prisma direto para buscar incluindo deletados e valida tenant manualmente
    const existing = await this.findResourceBeforeDelete(resource, id, empresaId);

    if (!existing) {
      throw new NotFoundException(`${this.getResourceTypeForAudit(resource)} com ID ${id} não encontrado`);
    }

    // Verificar se já está deletado
    if ((existing as any).deletedAt !== null) {
      throw new NotFoundException(
        `${this.getResourceTypeForAudit(resource)} com ID ${id} já está deletado`,
      );
    }

    // Fazer soft delete (update deletedAt) usando Prisma direto
    // (PrismaTenantService filtra deletedAt: null, então não pode ser usado para soft delete)
    // Mas validamos tenant manualmente antes de atualizar
    const deleted = await (this.prisma[resource] as any).update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    // Validar que o recurso deletado pertence ao tenant (segurança adicional)
    if (deleted.empresaId !== empresaId) {
      throw new ForbiddenException(
        `Acesso negado: ${this.getResourceTypeForAudit(resource)} não pertence à sua empresa`,
      );
    }

    // Registrar log de auditoria (não bloqueia se falhar)
    try {
      await this.auditLogService.record({
        empresaId,
        userId: userId || null,
        action: this.getActionForAudit(resource),
        resourceType: this.getResourceTypeForAudit(resource),
        resourceId: id,
        metadata: this.sanitizeMetadata(existing as ResourceMetadata),
        ip: request?.ip || request?.connection?.remoteAddress || null,
        userAgent: request?.headers?.["user-agent"] || null,
      });
    } catch (error) {
      // Não falhar a operação se o log falhar
      console.error(`Erro ao registrar log de auditoria (soft delete ${resource}):`, error);
    }

    return deleted as T;
  }

  /**
   * Realiza soft delete de múltiplos recursos
   * 
   * @param resource - Tipo do recurso
   * @param ids - Array de IDs dos recursos
   * @param empresaId - ID da empresa (tenant)
   * @param userId - ID do usuário que está deletando (opcional)
   * @param request - Request object para capturar IP/userAgent (opcional)
   * @returns Número de recursos deletados
   */
  async deleteMany(
    resource: SoftDeletableResource,
    ids: string[],
    empresaId: string,
    userId?: string | null,
    request?: any,
  ): Promise<number> {
    if (ids.length === 0) {
      return 0;
    }

    // Buscar recursos antes de deletar (para auditoria) usando Prisma direto
    // Validamos tenant manualmente depois
    const existing = await (this.prisma[resource] as any).findMany({
      where: {
        id: { in: ids },
        empresaId, // Validar tenant
        deletedAt: null, // Apenas não deletados
      },
    });

    if (existing.length === 0) {
      return 0;
    }

    // Validar que todos os recursos pertencem ao tenant
    existing.forEach((item: any) => {
      if (item.empresaId !== empresaId) {
        throw new ForbiddenException(
          `Acesso negado: ${this.getResourceTypeForAudit(resource)} não pertence à sua empresa`,
        );
      }
    });

    // Fazer soft delete em lote usando Prisma direto
    const result = await (this.prisma[resource] as any).updateMany({
      where: {
        id: { in: ids },
        empresaId, // Segurança: garantir que só deleta recursos do tenant
        deletedAt: null, // Garantir que não deleta novamente
      },
      data: {
        deletedAt: new Date(),
      },
    });

    // Registrar logs de auditoria para cada recurso deletado
    // (Não bloqueia se falhar, usa Promise.allSettled para não bloquear)
    await Promise.allSettled(
      existing.map(async (item: any) => {
        try {
          await this.auditLogService.record({
            empresaId,
            userId: userId || null,
            action: this.getActionForAudit(resource),
            resourceType: this.getResourceTypeForAudit(resource),
            resourceId: item.id,
            metadata: this.sanitizeMetadata(item as ResourceMetadata),
            ip: request?.ip || request?.connection?.remoteAddress || null,
            userAgent: request?.headers?.["user-agent"] || null,
          });
        } catch (error) {
          console.error(
            `Erro ao registrar log de auditoria (soft delete ${resource} ${item.id}):`,
            error,
          );
        }
      }),
    );

    return result.count;
  }

  /**
   * Restaura um recurso deletado (remove deletedAt)
   * 
   * @param resource - Tipo do recurso
   * @param id - ID do recurso
   * @param empresaId - ID da empresa (tenant)
   * @param userId - ID do usuário que está restaurando (opcional)
   * @param request - Request object (opcional)
   * @returns O recurso restaurado
   */
  async restore<T = any>(
    resource: SoftDeletableResource,
    id: string,
    empresaId: string,
    userId?: string | null,
    request?: any,
  ): Promise<T> {
    // Buscar o recurso (incluindo deletados) usando Prisma direto
    const existing = await this.findResourceBeforeDelete(resource, id, empresaId);

    if (!existing) {
      throw new NotFoundException(`${this.getResourceTypeForAudit(resource)} com ID ${id} não encontrado`);
    }

    // Verificar se está deletado
    if (existing.deletedAt === null) {
      throw new NotFoundException(
        `${this.getResourceTypeForAudit(resource)} com ID ${id} não está deletado`,
      );
    }

    // Restaurar (remover deletedAt) usando Prisma direto
    // (PrismaTenantService filtra deletedAt: null, então não pode ser usado para restaurar)
    const restored = await (this.prisma[resource] as any).update({
      where: { id },
      data: {
        deletedAt: null,
      },
    });

    // Validar que o recurso restaurado pertence ao tenant (segurança adicional)
    if (restored.empresaId !== empresaId) {
      throw new ForbiddenException(
        `Acesso negado: ${this.getResourceTypeForAudit(resource)} não pertence à sua empresa`,
      );
    }

    // Registrar log de auditoria (restauração)
    try {
      await this.auditLogService.record({
        empresaId,
        userId: userId || null,
        action: `${resource}.restore`,
        resourceType: this.getResourceTypeForAudit(resource),
        resourceId: id,
        metadata: this.sanitizeMetadata(existing as ResourceMetadata),
        ip: request?.ip || request?.connection?.remoteAddress || null,
        userAgent: request?.headers?.["user-agent"] || null,
      });
    } catch (error) {
      console.error(`Erro ao registrar log de auditoria (restore ${resource}):`, error);
    }

    return restored as T;
  }

  /**
   * Helper para buscar recurso antes de deletar
   * Usa Prisma direto (sem filtro de soft delete) para buscar mesmo se já estiver deletado
   * Valida manualmente que o recurso pertence ao tenant
   */
  private async findResourceBeforeDelete(
    resource: SoftDeletableResource,
    id: string,
    empresaId: string,
  ): Promise<any> {
    // Usar PrismaService direto para buscar incluindo deletados
    const existing = await (this.prisma[resource] as any).findUnique({
      where: { id },
    });

    if (!existing) {
      return null;
    }

    // Validar manualmente que pertence ao tenant
    if (existing.empresaId !== empresaId) {
      throw new ForbiddenException(
        `Acesso negado: ${this.getResourceTypeForAudit(resource)} não pertence à sua empresa`,
      );
    }

    return existing;
  }
}
