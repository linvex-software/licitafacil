import { Injectable, type CanActivate, type ExecutionContext, ForbiddenException } from "@nestjs/common";
import { type Reflector } from "@nestjs/core";
import { type UserRole } from "@licitafacil/shared";
import { ROLES_KEY } from "../decorators/roles.decorator";

/**
 * Guard para validar se o usuário possui um dos papéis necessários
 * 
 * Uso: @UseGuards(JwtAuthGuard, RolesGuard)
 *      @Roles(UserRole.ADMIN)
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Obter papéis necessários do decorator @Roles()
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Se não há papéis especificados, permitir acesso (rota pública para autenticados)
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Obter usuário do request (deve estar autenticado via JwtAuthGuard)
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException("Usuário não autenticado");
    }

    // Verificar se o usuário possui um dos papéis necessários
    const hasRole = requiredRoles.includes(user.role);

    if (!hasRole) {
      throw new ForbiddenException(
        `Acesso negado: esta ação requer um dos seguintes papéis: ${requiredRoles.join(", ")}`,
      );
    }

    return true;
  }
}
