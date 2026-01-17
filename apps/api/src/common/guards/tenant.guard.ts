import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";

/**
 * Guard para validar se um recurso pertence à empresa do usuário
 * 
 * Uso: @UseGuards(JwtAuthGuard, TenantGuard)
 * 
 * Para rotas como /empresas/:id, valida que o ID é da empresa do usuário.
 * A validação final de pertencimento deve ser feita no Service usando PrismaTenantService.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException("Usuário não autenticado");
    }

    if (!user.empresaId) {
      throw new ForbiddenException("Usuário não possui empresa associada");
    }

    // Para rotas /empresas/:id, validar que o ID é da empresa do usuário
    const route = request.route?.path || "";
    if (route.includes("/empresas/:id") || route.includes("/empresas/:empresaId")) {
      const resourceId = request.params?.id || request.params?.empresaId;
      if (resourceId && resourceId !== user.empresaId) {
        throw new ForbiddenException("Acesso negado: você só pode acessar sua própria empresa");
      }
    }

    // Para outras rotas, o filtro automático do PrismaTenantService garante isolamento
    // Este guard apenas valida que o usuário tem empresaId
    return true;
  }
}
